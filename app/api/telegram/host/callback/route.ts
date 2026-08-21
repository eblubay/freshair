import { applyHostAction } from "@/lib/host-bot"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	try { return NextResponse.json(await applyHostAction(await request.json()), { headers: { "Cache-Control": "no-store" } }) }
	catch (error) { const message = error instanceof Error ? error.message : "Invalid callback"; return NextResponse.json({ error: message }, { status: message.includes("Unauthorized") ? 403 : 400, headers: { "Cache-Control": "no-store" } }) }
}
