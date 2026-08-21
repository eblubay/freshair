import { confirmStripePaymentIntent } from "@/lib/stripe-payment-domain"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { isDirectBookingEnabled } from "@/lib/launch-config"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ reservationId: z.string().min(8), paymentIntentId: z.string().min(8).max(255) })

export async function POST(request: Request) {
	if (!isDirectBookingEnabled()) return NextResponse.json({ error: "Direct checkout is unavailable." }, { status: 404 })
	const rate = await allowDurableRateLimitedRequest("stripe-confirm", request, 10, 60_000)
	if (!rate.allowed) return NextResponse.json({ error: "Too many payment confirmation attempts." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } })
	try {
		return NextResponse.json(await confirmStripePaymentIntent(...Object.values(schema.parse(await request.json())) as [string, string]), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe payment confirmation failed." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
