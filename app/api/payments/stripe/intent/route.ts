import { BookingDomainError } from "@/lib/booking-domain"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { createStripePaymentIntent } from "@/lib/stripe-payment-domain"
import { isDirectBookingEnabled } from "@/lib/launch-config"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	if (!isDirectBookingEnabled()) return NextResponse.json({ error: "Direct checkout is unavailable." }, { status: 404 })
	const rate = await allowDurableRateLimitedRequest("stripe-intent", request, 4)
	if (!rate.allowed) return NextResponse.json({ error: "Too many payment attempts." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } })
	try { return NextResponse.json(await createStripePaymentIntent(await request.json()), { headers: { "Cache-Control": "no-store" } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare Stripe payment." }, { status: error instanceof BookingDomainError ? error.status : 400, headers: { "Cache-Control": "no-store" } }) }
}
