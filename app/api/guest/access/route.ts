import { getGuestPortalReservation } from "@/lib/guest-access"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ token: z.string().min(32).max(128) })

export async function POST(request: Request) {
	try {
		const { token } = schema.parse(await request.json())
		const reservation = await getGuestPortalReservation(token)
		if (!reservation) return NextResponse.json({ error: "This guest access link is invalid or expired." }, { status: 404 })
		return NextResponse.json(reservation, { headers: { "Cache-Control": "private, no-store" } })
	} catch {
		return NextResponse.json({ error: "Unable to open the guest portal." }, { status: 400 })
	}
}
