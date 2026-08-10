import { recalculateCleaningTaskForCheckout } from "@/lib/cleaning-domain"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ checkoutReservationId: z.string().min(8), reason: z.string().max(120).optional() })

export async function POST(request: Request) {
	if (!process.env.CALENDAR_SYNC_SECRET || request.headers.get("x-automation-secret") !== process.env.CALENDAR_SYNC_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	try {
		const data = schema.parse(await request.json())
		return NextResponse.json(await recalculateCleaningTaskForCheckout(data.checkoutReservationId, data.reason), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to recalculate cleaning." }, { status: 400 })
	}
}
