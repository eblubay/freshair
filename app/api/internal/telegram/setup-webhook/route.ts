import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { setupTelegramWebhook } from "@/lib/telegram-host-api"
import { NextResponse } from "next/server"

export async function POST() {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const [owner] = await queryClient`SELECT id FROM properties WHERE clerk_id=${userId} LIMIT 1`
	if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	try { return NextResponse.json(await setupTelegramWebhook(), { headers: { "Cache-Control": "no-store" } }) }
	catch { return NextResponse.json({ error: "Telegram webhook configuration failed" }, { status: 502, headers: { "Cache-Control": "no-store" } }) }
}
