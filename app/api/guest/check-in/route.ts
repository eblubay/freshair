import { hashGuestToken } from "@/lib/guest-access"
import { queryClient } from "@/lib/db"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
	token: z.string().min(32).max(128),
	arrivalTime: z.string().trim().max(80).optional(),
	occupants: z.coerce.number().int().min(1).max(16),
	emergencyContact: z.string().trim().max(240).optional(),
	typedConfirmation: z.string().trim().min(2).max(160),
	houseRulesVersion: z.literal("2026-08-10"),
	agreementVersion: z.literal("2026-08-10")
})

export async function POST(request: Request) {
	const rateLimit = await allowDurableRateLimitedRequest("guest-checkin", request, 6)
	if (!rateLimit.allowed) return NextResponse.json({ error: "Too many check-in attempts. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "private, no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	try {
		const data = schema.parse(await request.json())
		const [access] = await queryClient`
			SELECT reservation_id FROM guest_access_tokens
			WHERE token_hash=${hashGuestToken(data.token)}
				AND expires_at > now()
				AND revoked_at IS NULL
		`
		if (!access) return NextResponse.json({ error: "This guest access link is invalid or expired." }, { status: 404, headers: { "Cache-Control": "private, no-store" } })
		const [reservation] = await queryClient`SELECT total_guests FROM reservations WHERE id=${access.reservation_id}`
		if (!reservation || data.occupants > Number(reservation.total_guests)) return NextResponse.json({ error: "Occupants cannot exceed the reservation guest count." }, { status: 400, headers: { "Cache-Control": "private, no-store" } })
		await queryClient`INSERT INTO guest_checkins (id,reservation_id,arrival_time,occupants,emergency_contact,house_rules_version,agreement_version,typed_confirmation,accepted_at) VALUES (${nanoid()},${access.reservation_id},${data.arrivalTime ?? null},${data.occupants},${data.emergencyContact ?? null},${data.houseRulesVersion},${data.agreementVersion},${data.typedConfirmation},now()) ON CONFLICT (reservation_id) DO UPDATE SET arrival_time=EXCLUDED.arrival_time, occupants=EXCLUDED.occupants, emergency_contact=EXCLUDED.emergency_contact, house_rules_version=EXCLUDED.house_rules_version, agreement_version=EXCLUDED.agreement_version, typed_confirmation=EXCLUDED.typed_confirmation, accepted_at=now()`
		return NextResponse.json({ accepted: true }, { headers: { "Cache-Control": "private, no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save check-in." }, { status: 400, headers: { "Cache-Control": "private, no-store" } })
	}
}
