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
		const [consent] = await tx`SELECT 1 FROM booking_consents WHERE reservation_id=${data.reservationId} AND terms_accepted=true AND privacy_acknowledged=true`
		if (!consent) throw new BookingDomainError("Terms and Privacy Policy acceptance is required before payment.", 409)
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
		return { paymentId, transactionId: charge.transaction.id, confirmationCode: reservation.confirmation_code as string, status: "CONFIRMED", reused: false }
	})
	// Turnover automation must never roll back an already authorized payment.
	// Recalculation is triggered immediately, but failures are retriable by the
	// calendar automation endpoint and remain visible in application logs.
	void recalculateCleaningForReservationChange(data.reservationId, "DIRECT_BOOKING_CONFIRMED").catch((error) => {
		console.error("Unable to recalculate cleaning after direct booking confirmation", error)
	})
	return result
}

const refundSchema = z.object({ reservationId: z.string().min(8).max(128), amount: z.coerce.number().int().positive().optional(), reason: z.string().trim().max(500).optional() })

export async function refundBraintreePayment(input: unknown) {
	const data = refundSchema.parse(input)
	if (!paymentsAreServerEnabled()) throw new BookingDomainError("Online payment is not enabled for this environment.", 503)
	const [payment] = await queryClient`SELECT id,reservation_id,provider_transaction_id,amount,refunded_amount,status FROM payments WHERE reservation_id=${data.reservationId} AND provider='BRAINTREE' ORDER BY created_at DESC LIMIT 1`
	if (!payment?.provider_transaction_id) throw new BookingDomainError("A refundable Braintree payment was not found.", 404)
	const remaining = Number(payment.amount) - Number(payment.refunded_amount)
	const amount = data.amount ?? remaining
	if (amount > remaining) throw new BookingDomainError("Refund amount exceeds the unsettled payment balance.")
	const gateway = getBraintreeGateway()
	const result = await gateway.transaction.refund(payment.provider_transaction_id as string, asCurrency(amount))
	if (!result.success || !result.transaction) throw new BookingDomainError("Refund could not be submitted.", 402)
	await queryClient.begin(async (tx) => {
		await tx`UPDATE payments SET refunded_amount=refunded_amount+${amount},status=CASE WHEN refunded_amount+${amount} >= amount THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,provider_status=${result.transaction.status},updated_at=now() WHERE id=${payment.id}`
		await tx`UPDATE reservations SET payment_status=CASE WHEN amount_paid-${amount} <= 0 THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,amount_paid=GREATEST(0,amount_paid-${amount}),amount_due=amount_due+${amount},updated_at=now() WHERE id=${data.reservationId}`
		await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${data.reservationId},'PAYMENT_REFUND_SUBMITTED',${JSON.stringify({ amount, reason: data.reason ?? null, transactionId: result.transaction?.id })}::jsonb)`
	})
	return { status: amount === remaining ? "REFUNDED" : "PARTIALLY_REFUNDED", refundTransactionId: result.transaction.id }
}

export async function voidBraintreePayment(reservationId: string) {
	if (!paymentsAreServerEnabled()) throw new BookingDomainError("Online payment is not enabled for this environment.", 503)
	const [payment] = await queryClient`SELECT id,provider_transaction_id FROM payments WHERE reservation_id=${reservationId} AND provider='BRAINTREE' AND status IN ('AUTHORIZED','SUBMITTED_FOR_SETTLEMENT') ORDER BY created_at DESC LIMIT 1`
	if (!payment?.provider_transaction_id) throw new BookingDomainError("A voidable Braintree payment was not found.", 404)
	const gateway = getBraintreeGateway()
	const result = await gateway.transaction.void(payment.provider_transaction_id as string)
	if (!result.success) throw new BookingDomainError("Payment void could not be submitted.", 402)
	await queryClient.begin(async (tx) => {
		await tx`UPDATE payments SET status='VOIDED',provider_status=${result.transaction?.status ?? "VOIDED"},updated_at=now() WHERE id=${payment.id}`
		await tx`UPDATE reservations SET booking_status='CANCELLED',payment_status='VOIDED',cancelled_at=now(),updated_at=now() WHERE id=${reservationId}`
		await tx`DELETE FROM inventory_days WHERE reservation_id=${reservationId}`
		await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${reservationId},'PAYMENT_VOIDED',${JSON.stringify({ transactionId: payment.provider_transaction_id })}::jsonb)`
	})
	return { status: "VOIDED" }
}
