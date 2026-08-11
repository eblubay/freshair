import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { canUseBraintree, paymentsAreServerEnabled } from "@/lib/payment-providers"
import { isSmtpConfigured } from "@/lib/postmark"
import { NextResponse } from "next/server"

type Check = { status: "READY" | "AWAITING_CREDENTIAL" | "DISABLED" | "ERROR" }

export const dynamic = "force-dynamic"

export async function GET() {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } })
	let database: Check = { status: "ERROR" }
	try {
		await queryClient`SELECT 1`
		database = { status: "READY" }
	} catch {
		database = { status: "ERROR" }
	}

	const checks = {
		database,
		braintree: { status: paymentsAreServerEnabled() ? "READY" : canUseBraintree() ? "DISABLED" : "AWAITING_CREDENTIAL" } satisfies Check,
		stripe: { status: "AWAITING_CREDENTIAL" } satisfies Check,
		ach: { status: "AWAITING_CREDENTIAL" } satisfies Check,
		smtp: { status: isSmtpConfigured() ? "READY" : "AWAITING_CREDENTIAL" } satisfies Check,
		calendar: { status: "AWAITING_CREDENTIAL" } satisfies Check,
		telegram: { status: process.env.TELEGRAM_BOT_TOKEN ? "AWAITING_CREDENTIAL" : "DISABLED" } satisfies Check,
		chatwoot: { status: process.env.CHATWOOT_WEBHOOK_SECRET ? "AWAITING_CREDENTIAL" : "DISABLED" } satisfies Check,
		n8n: { status: process.env.N8N_WEBHOOK_URL ? "AWAITING_CREDENTIAL" : "DISABLED" } satisfies Check,
		ollama: { status: process.env.OLLAMA_BASE_URL ? "AWAITING_CREDENTIAL" : "DISABLED" } satisfies Check,
		weather: { status: "READY" } satisfies Check
	}
	return NextResponse.json({ checks, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } })
}
