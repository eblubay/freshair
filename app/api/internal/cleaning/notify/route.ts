import { notifyCleanerForTask } from "@/lib/cleaning-domain"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ taskId: z.string().min(8) })

export async function POST(request: Request) {
	if (!process.env.CALENDAR_SYNC_SECRET || request.headers.get("x-automation-secret") !== process.env.CALENDAR_SYNC_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	try {
		return NextResponse.json(await notifyCleanerForTask(schema.parse(await request.json()).taskId), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to notify cleaner." }, { status: 400 })
	}
}
