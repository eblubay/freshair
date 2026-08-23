import { processTelegramHostUpdate } from "@/lib/telegram-host-update"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const secret = process.env.TELEGRAM_HOST_WEBHOOK_SECRET?.trim()
	if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret)
		return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try { return NextResponse.json(await processTelegramHostUpdate(await request.json()), { headers: { "Cache-Control": "no-store" } }) }
	catch (error) { const message = error instanceof Error ? error.message : "Invalid Telegram update"; return NextResponse.json({ ok: false }, { status: message.includes("Unauthorized") ? 403 : 400, headers: { "Cache-Control": "no-store" } }) }
}
