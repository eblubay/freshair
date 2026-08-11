import "server-only"

import { BookingDomainError } from "@/lib/booking-domain"
import { queryClient } from "@/lib/db"
import { getStripeClient, stripePaymentsAreServerEnabled } from "@/lib/payment-providers"
import { nanoid } from "nanoid"
import { z } from "zod"

const schema = z.object({ reservationId: z.string().min(8), idempotencyKey: z.string().uuid() })
const refundSchema = z.object({ reservationId: z.string().min(8), amount: z.coerce.number().int().positive().optional(), reason: z.string().trim().max(500).optional() })

/** Creates, but never confirms, a PaymentIntent. Client-side Stripe Elements owns card entry. */
export async function createStripePaymentIntent(input: unknown) {
	const data = schema.parse(input)
	if (!stripePaymentsAreServerEnabled()) throw new BookingDomainError("Stripe is not enabled for this environment.", 503)
	const result = await queryClient.begin(async (tx) => {
		const [reservation] = await tx`SELECT id,confirmation_code,total_amount,currency,booking_status FROM reservations WHERE id=${data.reservationId} FOR UPDATE`
		if (!reservation) throw new BookingDomainError("Reservation not found.", 404)
		const [consent] = await tx`SELECT 1 FROM booking_consents WHERE reservation_id=${data.reservationId} AND terms_accepted=true AND privacy_acknowledged=true`
		if (!consent) throw new BookingDomainError("Terms and Privacy Policy acceptance is required before payment.", 409)
		if (reservation.booking_status !== "HOLD") throw new BookingDomainError("This reservation is no longer awaiting payment.", 409)
		const [held] = await tx`SELECT 1 FROM inventory_days WHERE reservation_id=${data.reservationId} AND status='HOLD' AND hold_expires_at > now() LIMIT 1`
		if (!held) throw new BookingDomainError("This booking hold has expired.", 409)
		const [existing] = await tx`SELECT provider_transaction_id FROM payments WHERE idempotency_key=${data.idempotencyKey} FOR UPDATE`
		if (existing?.provider_transaction_id) return { paymentIntentId: existing.provider_transaction_id as string, reused: true }
		const stripe = getStripeClient()
		const intent = await stripe.paymentIntents.create({ amount: Number(reservation.total_amount), currency: (reservation.currency as string).toLowerCase(), metadata: { reservationId: reservation.id as string, confirmationCode: reservation.confirmation_code as string }, automatic_payment_methods: { enabled: true } }, { idempotencyKey: data.idempotencyKey })
		await tx`INSERT INTO payments (id,reservation_id,provider,provider_transaction_id,method,amount,currency,status,idempotency_key,provider_status) VALUES (${nanoid()},${data.reservationId},'STRIPE',${intent.id},'STRIPE_ELEMENTS',${reservation.total_amount},${reservation.currency},'PENDING',${data.idempotencyKey},${intent.status}) ON CONFLICT (idempotency_key) DO UPDATE SET provider_transaction_id=EXCLUDED.provider_transaction_id,provider_status=EXCLUDED.provider_status,updated_at=now()`
		return { paymentIntentId: intent.id, clientSecret: intent.client_secret, reused: false }
	})
	return result
}

export async function applyStripePaymentIntent(intent: { id: string; status: string; metadata: Record<string, string>; amount_received: number; payment_method_types: string[] }) {
	const reservationId = intent.metadata.reservationId
	if (!reservationId) return { ignored: true }
	return queryClient.begin(async (tx) => {
		const [payment] = await tx`SELECT id,reservation_id,status FROM payments WHERE provider='STRIPE' AND provider_transaction_id=${intent.id} FOR UPDATE`
		if (!payment) return { ignored: true }
		if (intent.status === "succeeded" && payment.status !== "PAID") {
			await tx`UPDATE payments SET status='PAID',provider_status=${intent.status},settled_at=now(),updated_at=now() WHERE id=${payment.id}`
			await tx`UPDATE reservations SET booking_status='CONFIRMED',payment_status='PAID',payment_provider='STRIPE',provider_transaction_id=${intent.id},amount_paid=${intent.amount_received},amount_due=GREATEST(0,total_amount-${intent.amount_received}),confirmed_at=now(),california_grace_period_eligible=(scheduled_checkin_at >= now() + interval '72 hours'),california_grace_period_expires_at=CASE WHEN scheduled_checkin_at >= now() + interval '72 hours' THEN now() + interval '24 hours' ELSE NULL END,updated_at=now() WHERE id=${reservationId} AND booking_status='HOLD'`
			await tx`UPDATE inventory_days SET status='CONFIRMED',hold_expires_at=NULL WHERE reservation_id=${reservationId} AND status='HOLD'`
			await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${reservationId},'STRIPE_PAYMENT_SUCCEEDED',${JSON.stringify({ paymentIntentId: intent.id })}::jsonb)`
			return { confirmed: true }
		}
		if (["payment_failed", "canceled"].includes(intent.status)) await tx`UPDATE payments SET status='FAILED',provider_status=${intent.status},updated_at=now() WHERE id=${payment.id}`
		return { confirmed: false }
	})
}

export async function refundStripePayment(input: unknown) {
	const data = refundSchema.parse(input)
	if (!stripePaymentsAreServerEnabled()) throw new BookingDomainError("Stripe is not enabled for this environment.", 503)
	const [payment] = await queryClient`
		SELECT id,provider_transaction_id,amount,refunded_amount
		FROM payments WHERE reservation_id=${data.reservationId} AND provider='STRIPE'
		ORDER BY created_at DESC LIMIT 1
	`
	if (!payment?.provider_transaction_id) throw new BookingDomainError("A refundable Stripe payment was not found.", 404)
	const remaining = Number(payment.amount) - Number(payment.refunded_amount)
	const amount = data.amount ?? remaining
	if (amount > remaining) throw new BookingDomainError("Refund amount exceeds the captured payment balance.")
	const refund = await getStripeClient().refunds.create({ payment_intent: payment.provider_transaction_id as string, amount, metadata: { reservationId: data.reservationId, reason: data.reason ?? "" } })
	await queryClient.begin(async (tx) => {
		await tx`UPDATE payments SET refunded_amount=refunded_amount+${amount},status=CASE WHEN refunded_amount+${amount} >= amount THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,provider_status=${refund.status},updated_at=now() WHERE id=${payment.id}`
		await tx`UPDATE reservations SET payment_status=CASE WHEN amount_paid-${amount} <= 0 THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,amount_paid=GREATEST(0,amount_paid-${amount}),amount_due=amount_due+${amount},updated_at=now() WHERE id=${data.reservationId}`
		await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${data.reservationId},'STRIPE_REFUND_SUBMITTED',${JSON.stringify({ amount, refundId: refund.id, reason: data.reason ?? null })}::jsonb)`
	})
	return { status: amount === remaining ? "REFUNDED" : "PARTIALLY_REFUNDED", refundId: refund.id }
}

export async function confirmStripePaymentIntent(reservationId: string, paymentIntentId: string) {
	if (!stripePaymentsAreServerEnabled()) throw new BookingDomainError("Stripe is not enabled for this environment.", 503)
	const [payment] = await queryClient`SELECT 1 FROM payments WHERE reservation_id=${reservationId} AND provider='STRIPE' AND provider_transaction_id=${paymentIntentId}`
	if (!payment) throw new BookingDomainError("Stripe payment intent was not found for this reservation.", 404)
	const intent = await getStripeClient().paymentIntents.retrieve(paymentIntentId)
	if (intent.metadata.reservationId !== reservationId) throw new BookingDomainError("Stripe payment intent does not match this reservation.", 409)
	return applyStripePaymentIntent(intent)
}
