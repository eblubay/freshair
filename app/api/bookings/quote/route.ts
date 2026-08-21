import { BookingDomainError, createQuote } from "@/lib/booking-domain"
import { isDirectBookingEnabled } from "@/lib/launch-config"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	if (!isDirectBookingEnabled()) return NextResponse.json({ error: "Direct checkout is unavailable. Please request availability." }, { status: 404, headers: { "Cache-Control": "no-store" } })
	const rateLimit = await allowDurableRateLimitedRequest("booking-quote", request)
	if (!rateLimit.allowed) return NextResponse.json({ error: "Too many availability requests. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	try {
		return NextResponse.json(await createQuote(await request.json()), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare quote." }, { status: error instanceof BookingDomainError ? error.status : 400, headers: { "Cache-Control": "no-store" } })
	}
}
