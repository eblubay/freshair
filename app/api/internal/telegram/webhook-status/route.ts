import { auth } from "@clerk/nextjs/server"
import { ownerAccess } from "@/lib/owner-auth"
import { getTelegramWebhookStatus, telegramWebhookUrl } from "@/lib/telegram-host-api"
import { resolveHostTelegramEnvironment } from "@/lib/telegram-env"
import { NextResponse } from "next/server"

export async function GET() {
	const { userId } = await auth()
	const access = ownerAccess(userId)
	if (!access.allowed) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status })
	try { return NextResponse.json(await getTelegramWebhookStatus(), { headers: { "Cache-Control": "no-store" } }) }
	catch { return NextResponse.json({ telegramConfigured: Boolean(resolveHostTelegramEnvironment().token), webhookConfigured: false, webhookUrl: telegramWebhookUrl(), pending_update_count: 0, last_error_date: null, last_error_message: "Unable to retrieve Telegram webhook status" }, { status: 502, headers: { "Cache-Control": "no-store" } }) }
}
