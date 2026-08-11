import { auth } from "@clerk/nextjs/server"
import { syncExternalCalendar } from "@/lib/calendar-sync"
import { queryClient } from "@/lib/db"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ calendarId: z.string().min(8) })

export async function POST(request: Request) {
	const rate = await allowDurableRateLimitedRequest("calendar-sync", request, 5, 60_000)
	if (!rate.allowed) return NextResponse.json({ error: "Too many calendar sync attempts." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } })
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const { calendarId } = schema.parse(await request.json())
		const [calendar] = await queryClient`SELECT c.id FROM external_calendars c JOIN properties p ON p.id=c.property_id WHERE c.id=${calendarId} AND p.clerk_id=${userId}`
		if (!calendar) return NextResponse.json({ error: "Calendar not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		return NextResponse.json(await syncExternalCalendar(calendarId), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar sync failed." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
