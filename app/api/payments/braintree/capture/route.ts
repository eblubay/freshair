import { BookingDomainError } from "@/lib/booking-domain"
import { captureBraintreePayment } from "@/lib/payment-domain"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const rateLimit = await allowDurableRateLimitedRequest("braintree-capture", request, 4)
	if (!rateLimit.allowed) return NextResponse.json({ error: "Too many payment attempts. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	try {
		const payment = await captureBraintreePayment(await request.json())
		return NextResponse.json(payment, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to process payment." },
			{ status: error instanceof BookingDomainError ? error.status : 400, headers: { "Cache-Control": "no-store" } }
		)
	}
}
