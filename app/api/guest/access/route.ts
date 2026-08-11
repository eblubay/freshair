import { getGuestPortalReservation } from "@/lib/guest-access"
import { allowRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ token: z.string().min(32).max(128) })

export async function POST(request: Request) {
	const rateLimit = allowRateLimitedRequest("guest-access", request, 8)
	if (!rateLimit.allowed) return NextResponse.json({ error: "Too many access attempts. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "private, no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	try {
		const { token } = schema.parse(await request.json())
		const reservation = await getGuestPortalReservation(token)
		if (!reservation) return NextResponse.json({ error: "This guest access link is invalid or expired." }, { status: 404, headers: { "Cache-Control": "private, no-store" } })
		return NextResponse.json(reservation, { headers: { "Cache-Control": "private, no-store" } })
	} catch {
		return NextResponse.json({ error: "Unable to open the guest portal." }, { status: 400 })
	}
}
