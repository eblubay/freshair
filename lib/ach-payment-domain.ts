import "server-only"

import { BookingDomainError } from "@/lib/booking-domain"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"
import { z } from "zod"

const schema = z.object({ reservationId: z.string().min(8), idempotencyKey: z.string().uuid(), providerReference: z.string().trim().min(8).max(255) })

/**
 * ACH authorization must happen at an approved provider. This records only the
 * provider reference and retains inventory as a pending hold; it never marks
 * the reservation paid until an authenticated settlement webhook arrives.
 */
export async function createPendingAchPayment(input: unknown) {
	const data = schema.parse(input)
	const result = await queryClient.begin(async (tx) => {
		const [reservation] = await tx`SELECT r.id,r.total_amount,r.currency,r.booking_status,b.ach_pending_hold_hours FROM reservations r JOIN booking_settings b ON b.property_id=r.property_id WHERE r.id=${data.reservationId} FOR UPDATE`
		if (!reservation) throw new BookingDomainError("Reservation not found.", 404)
		if (reservation.booking_status !== "HOLD") throw new BookingDomainError("This reservation is no longer awaiting payment.", 409)
		const [existing] = await tx`SELECT id,status FROM payments WHERE idempotency_key=${data.idempotencyKey} FOR UPDATE`
		if (existing) return { paymentId: existing.id as string, status: existing.status as string, reused: true }
		const [held] = await tx`SELECT 1 FROM inventory_days WHERE reservation_id=${data.reservationId} AND status='HOLD' AND hold_expires_at > now() LIMIT 1`
		if (!held) throw new BookingDomainError("This booking hold has expired.", 409)
		const paymentId = nanoid()
		const pendingHours = Math.max(1, Math.min(168, Number(reservation.ach_pending_hold_hours)))
		await tx`INSERT INTO payments (id,reservation_id,provider,provider_transaction_id,method,amount,currency,status,idempotency_key,provider_status) VALUES (${paymentId},${data.reservationId},'ACH',${data.providerReference},'ACH',${reservation.total_amount},${reservation.currency},'PENDING',${data.idempotencyKey},'PENDING_SETTLEMENT')`
		await tx`UPDATE reservations SET payment_status='PENDING',payment_provider='ACH',provider_transaction_id=${data.providerReference},updated_at=now() WHERE id=${data.reservationId}`
		await tx`UPDATE inventory_days SET hold_expires_at=GREATEST(hold_expires_at,now()+(${pendingHours} * interval '1 hour')) WHERE reservation_id=${data.reservationId} AND status='HOLD'`
		await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${data.reservationId},'ACH_PENDING_CREATED',${JSON.stringify({ providerReference: data.providerReference })}::jsonb)`
		return { paymentId, status: "PENDING", reused: false }
	})
	return result
}

export async function settleAchPayment(providerReference: string, settled: boolean) {
	return queryClient.begin(async (tx) => {
		const [payment] = await tx`SELECT id,reservation_id,amount FROM payments WHERE provider='ACH' AND provider_transaction_id=${providerReference} FOR UPDATE`
		if (!payment) return { ignored: true }
		if (settled) {
			await tx`UPDATE payments SET status='SETTLED',provider_status='SETTLED',settled_at=now(),updated_at=now() WHERE id=${payment.id}`
			await tx`UPDATE reservations SET booking_status='CONFIRMED',payment_status='PAID',amount_paid=${payment.amount},amount_due=0,confirmed_at=now(),updated_at=now() WHERE id=${payment.reservation_id}`
			await tx`UPDATE inventory_days SET status='CONFIRMED',hold_expires_at=NULL WHERE reservation_id=${payment.reservation_id}`
		} else {
			await tx`UPDATE payments SET status='FAILED',provider_status='FAILED',updated_at=now() WHERE id=${payment.id}`
			await tx`UPDATE reservations SET booking_status='CANCELLED',payment_status='FAILED',cancelled_at=now(),updated_at=now() WHERE id=${payment.reservation_id}`
			await tx`DELETE FROM inventory_days WHERE reservation_id=${payment.reservation_id} AND status='HOLD'`
			await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${payment.reservation_id},'ACH_SETTLEMENT_FAILED',${JSON.stringify({ providerReference })}::jsonb)`
		}
		return { settled }
	})
}
