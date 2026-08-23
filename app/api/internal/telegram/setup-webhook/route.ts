import { auth } from "@clerk/nextjs/server"
import { ownerAccess } from "@/lib/owner-auth"
import { setupTelegramWebhook } from "@/lib/telegram-host-api"
import { NextResponse } from "next/server"

export async function POST() {
	const { userId } = await auth()
	const access = ownerAccess(userId)
	if (!access.allowed) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status })
	try { return NextResponse.json(await setupTelegramWebhook(), { headers: { "Cache-Control": "no-store" } }) }
	catch { return NextResponse.json({ error: "Telegram webhook configuration failed" }, { status: 502, headers: { "Cache-Control": "no-store" } }) }
}
