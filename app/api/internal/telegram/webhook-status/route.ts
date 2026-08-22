import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { getTelegramWebhookStatus } from "@/lib/telegram-host-api"
import { NextResponse } from "next/server"

export async function GET() {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const [owner] = await queryClient`SELECT id FROM properties WHERE clerk_id=${userId} LIMIT 1`
	if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	try { return NextResponse.json(await getTelegramWebhookStatus(), { headers: { "Cache-Control": "no-store" } }) }
	catch { return NextResponse.json({ telegramConfigured: Boolean(process.env.TELEGRAM_HOST_BOT_TOKEN), webhookConfigured: false, webhookUrl: process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/+$/, "")}/api/telegram/host/callback` : "", pending_update_count: 0, last_error_date: null, last_error_message: "Unable to retrieve Telegram webhook status" }, { status: 502, headers: { "Cache-Control": "no-store" } }) }
}
