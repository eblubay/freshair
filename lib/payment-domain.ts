import "server-only"

import { BookingDomainError } from "@/lib/booking-domain"
import { recalculateCleaningForReservationChange } from "@/lib/cleaning-domain"
import { queryClient } from "@/lib/db"
import { getBraintreeGateway, paymentsAreServerEnabled } from "@/lib/payment-providers"
import { nanoid } from "nanoid"
import { z } from "zod"

const captureSchema = z.object({
	reservationId: z.string().min(8).max(128),
	paymentMethodNonce: z.string().min(8).max(4096),
	idempotencyKey: z.string().uuid()
})

const asCurrency = (amount: number) => (amount / 100).toFixed(2)

export async function captureBraintreePayment(input: unknown) {
	const data = captureSchema.parse(input)
	if (!paymentsAreServerEnabled()) throw new BookingDomainError("Online payment is not enabled for this environment.", 503)

	const result = await queryClient.begin(async (tx) => {
		const [existing] = await tx`SELECT id, provider_transaction_id, status FROM payments WHERE idempotency_key=${data.idempotencyKey} FOR UPDATE`
		if (existing) return { paymentId: existing.id as string, transactionId: existing.provider_transaction_id as string | null, status: existing.status as string, reused: true }

		const [reservation] = await tx`
			SELECT id, confirmation_code, total_amount, currency, booking_status, payment_status
			FROM reservations WHERE id=${data.reservationId} FOR UPDATE
		`
		if (!reservation) throw new BookingDomainError("Reservation not found.", 404)
		if (reservation.booking_status !== "HOLD") throw new BookingDomainError("This reservation is no longer awaiting payment.", 409)
		const [heldDay] = await tx`SELECT 1 FROM inventory_days WHERE reservation_id=${data.reservationId} AND status='HOLD' AND hold_expires_at > now() LIMIT 1`
		if (!heldDay) throw new BookingDomainError("This booking hold has expired. Please request availability again.", 409)

		const gateway = getBraintreeGateway()
		const charge = await gateway.transaction.sale({
			amount: asCurrency(Number(reservation.total_amount)),
			paymentMethodNonce: data.paymentMethodNonce,
			orderId: reservation.confirmation_code as string,
			options: { submitForSettlement: true }
		})
		if (!charge.success || !charge.transaction) throw new BookingDomainError("Your payment could not be authorized. No booking was confirmed.", 402)

		const paymentId = nanoid()
		await tx`INSERT INTO payments (id,reservation_id,provider,provider_transaction_id,method,amount,currency,status,idempotency_key,provider_status,settled_at) VALUES (${paymentId},${data.reservationId},'BRAINTREE',${charge.transaction.id},${charge.transaction.paymentInstrumentType ?? null},${reservation.total_amount},${reservation.currency},'SUBMITTED_FOR_SETTLEMENT',${data.idempotencyKey},${charge.transaction.status},now())`
		await tx`UPDATE reservations SET booking_status='CONFIRMED', payment_status='PAID', payment_provider='BRAINTREE', provider_transaction_id=${charge.transaction.id}, amount_paid=total_amount, amount_due=0, confirmed_at=now(), updated_at=now() WHERE id=${data.reservationId}`
		await tx`UPDATE inventory_days SET status='CONFIRMED', hold_expires_at=NULL WHERE reservation_id=${data.reservationId}`
		await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${data.reservationId},'PAYMENT_CAPTURED',${JSON.stringify({ provider: "BRAINTREE", transactionId: charge.transaction.id })}::jsonb)`
		return { paymentId, transactionId: charge.transaction.id, status: "CONFIRMED", reused: false }
	})
	// Turnover automation must never roll back an already authorized payment.
	// Recalculation is triggered immediately, but failures are retriable by the
	// calendar automation endpoint and remain visible in application logs.
	void recalculateCleaningForReservationChange(data.reservationId, "DIRECT_BOOKING_CONFIRMED").catch((error) => {
		console.error("Unable to recalculate cleaning after direct booking confirmation", error)
	})
	return result
}
