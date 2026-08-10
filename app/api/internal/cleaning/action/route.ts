import { applyCleaningTaskAction } from "@/lib/cleaning-domain"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	if (!process.env.CALENDAR_SYNC_SECRET || request.headers.get("x-automation-secret") !== process.env.CALENDAR_SYNC_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	try {
		return NextResponse.json(await applyCleaningTaskAction(await request.json()), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update cleaning task." }, { status: 400 })
	}
}
