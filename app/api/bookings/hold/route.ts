import { BookingDomainError, createHold } from "@/lib/booking-domain"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { isDirectBookingEnabled } from "@/lib/launch-config"
import { z } from "zod"

const schema = z.object({
	quoteInput: z.unknown(),
	guest: z.object({ firstName: z.string().trim().min(1), lastName: z.string().trim().min(1), email: z.string().email(), phone: z.string().max(40).optional() }),
	consent: z.object({ termsAccepted: z.literal(true), privacyAcknowledged: z.literal(true), houseRulesAccepted: z.literal(true), termsVersion: z.literal("2026-08-11"), privacyVersion: z.literal("2026-08-11"), houseRulesVersion: z.literal("2026-08-11") }),
	clientRequestId: z.string().uuid()
})

export async function POST(request: Request) {
	if (!isDirectBookingEnabled()) return NextResponse.json({ error: "Direct checkout is unavailable. Please request availability." }, { status: 404, headers: { "Cache-Control": "no-store" } })
	const rateLimit = await allowDurableRateLimitedRequest("booking-hold", request, 6)
	if (!rateLimit.allowed) return NextResponse.json({ error: "Too many booking attempts. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	try {
		const data = schema.parse(await request.json())
		const evidence = { userAgent: request.headers.get("user-agent")?.slice(0, 500) }
		return NextResponse.json(await createHold(data.quoteInput, data.guest, data.clientRequestId, data.consent, evidence), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to hold dates." }, { status: error instanceof BookingDomainError ? error.status : 400 })
	}
}
