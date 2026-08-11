import { BookingDomainError } from "@/lib/booking-domain"
import { createPendingAchPayment } from "@/lib/ach-payment-domain"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const rate = await allowDurableRateLimitedRequest("ach-pending", request, 4)
	if (!rate.allowed) return NextResponse.json({ error: "Too many payment attempts." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } })
	try { return NextResponse.json(await createPendingAchPayment(await request.json()), { headers: { "Cache-Control": "no-store" } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create ACH payment." }, { status: error instanceof BookingDomainError ? error.status : 400, headers: { "Cache-Control": "no-store" } }) }
}
