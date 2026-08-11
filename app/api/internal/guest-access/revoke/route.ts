import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ reservationId: z.string().min(8).max(128) })

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) {
		return NextResponse.json(
			{ error: "Owner authentication is required." },
			{ status: 401, headers: { "Cache-Control": "no-store" } }
		)
	}

	try {
		const { reservationId } = schema.parse(await request.json())
		const [reservation] = await queryClient`
			SELECT r.id FROM reservations r
			JOIN properties p ON p.id=r.property_id
			WHERE r.id=${reservationId} AND p.clerk_id=${userId}
		`
		if (!reservation) {
			return NextResponse.json({ error: "Reservation not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		}

		const revoked = await queryClient`
			UPDATE guest_access_tokens
			SET revoked_at=now()
			WHERE reservation_id=${reservationId} AND revoked_at IS NULL
			RETURNING id
		`
		return NextResponse.json(
			{ revoked: revoked.length },
			{ headers: { "Cache-Control": "no-store" } }
		)
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to revoke guest access." },
			{ status: 400, headers: { "Cache-Control": "no-store" } }
		)
	}
}
