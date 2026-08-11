import { applyStripePaymentIntent } from "@/lib/stripe-payment-domain"
import { getStripeClient } from "@/lib/payment-providers"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: Request) {
	const signature = request.headers.get("stripe-signature")
	const secret = process.env.STRIPE_WEBHOOK_SECRET
	if (!signature || !secret) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 })
	try {
		const event = getStripeClient().webhooks.constructEvent(await request.text(), signature, secret)
		const [duplicate] = await queryClient`SELECT 1 FROM processed_webhook_events WHERE provider='STRIPE' AND event_id=${event.id}`
		if (duplicate) return NextResponse.json({ received: true, duplicate: true })
		await queryClient`INSERT INTO processed_webhook_events (provider,event_id,payload) VALUES ('STRIPE',${event.id},${JSON.stringify({ type: event.type })}::jsonb)`
		if (["payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.canceled"].includes(event.type) && event.data.object.object === "payment_intent") {
			await applyStripePaymentIntent(event.data.object as Stripe.PaymentIntent)
		}
		return NextResponse.json({ received: true })
	} catch { return NextResponse.json({ error: "Invalid Stripe webhook." }, { status: 400 }) }
}
