import { processTelegramHostUpdate } from "@/lib/telegram-host-update"
import { validTelegramWebhookSecret } from "@/lib/telegram-env"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	if (!validTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token")))
		return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try { return NextResponse.json(await processTelegramHostUpdate(await request.json()), { headers: { "Cache-Control": "no-store" } }) }
	catch (error) {
		// A correctly signed update from an unauthorized chat is acknowledged but never processed.
		// Returning 403 makes Telegram classify the webhook itself as broken and retry the update.
		const unauthorizedChat = error instanceof Error && error.message.includes("Unauthorized")
		return NextResponse.json({ ok: unauthorizedChat }, { status: unauthorizedChat ? 200 : 400, headers: { "Cache-Control": "no-store" } })
	}
}
