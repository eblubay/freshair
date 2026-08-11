import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { canUseBraintree, canUseStripe, paymentsAreServerEnabled, stripePaymentsAreServerEnabled } from "@/lib/payment-providers"
import { isSmtpConfigured } from "@/lib/postmark"
import { NextResponse } from "next/server"

type Status = "READY" | "SANDBOX" | "NOT_CONFIGURED" | "DEGRADED" | "ERROR"
type Check = { status: Status; detail?: string }

export const dynamic = "force-dynamic"

function configured(status: boolean, detail: string): Check {
	return status ? { status: "DEGRADED", detail } : { status: "NOT_CONFIGURED" }
}

export async function GET() {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } })
	const [owner] = await queryClient`SELECT id FROM properties WHERE clerk_id=${userId} LIMIT 1`
	if (!owner) return NextResponse.json({ error: "Owner access is required." }, { status: 403, headers: { "Cache-Control": "private, no-store" } })

	let database: Check = { status: "ERROR" }
	let calendar: Check = { status: "NOT_CONFIGURED" }
	try {
		await queryClient`SELECT 1`
		database = { status: "READY" }
		const [calendarSummary] = await queryClient`
			SELECT count(*)::int AS total,
				count(*) FILTER (WHERE last_success_at IS NULL OR last_success_at < now() - interval '30 hours')::int AS stale,
				count(*) FILTER (WHERE last_sync_status='ERROR')::int AS errors
			FROM external_calendars c JOIN properties p ON p.id=c.property_id
			WHERE p.clerk_id=${userId} AND c.enabled=true
		`
		const total = Number(calendarSummary?.total ?? 0)
		const stale = Number(calendarSummary?.stale ?? 0)
		const errors = Number(calendarSummary?.errors ?? 0)
		calendar = total === 0 ? { status: "NOT_CONFIGURED" } : errors > 0 ? { status: "ERROR", detail: `${errors} configured feed(s) failed.` } : stale > 0 ? { status: "DEGRADED", detail: `${stale} configured feed(s) are stale.` } : { status: "READY" }
	} catch {
		database = { status: "ERROR" }
	}

	const braintree: Check = paymentsAreServerEnabled() ? (process.env.BRAINTREE_ENVIRONMENT === "production" ? { status: "READY" } : { status: "SANDBOX" }) : configured(canUseBraintree(), "Credentials exist but online payments are disabled.")
	const stripe: Check = stripePaymentsAreServerEnabled() ? (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? { status: "READY" } : { status: "SANDBOX" }) : configured(canUseStripe(), "Credentials exist but online payments are disabled.")
	const smtp: Check = isSmtpConfigured() && Boolean(process.env.FROM_EMAIL || process.env.SMTP_USER) ? { status: "DEGRADED", detail: "SMTP settings are present; test delivery is still required." } : { status: "NOT_CONFIGURED" }
	const automationConfigured = Boolean(process.env.AUTOMATION_SECRET && (process.env.SHELLBYTHESHORE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL))
	const checks = {
		database,
		directBooking: { status: database.status === "READY" ? "READY" : "ERROR" } satisfies Check,
		braintree,
		stripe,
		ach: configured(Boolean(process.env.ACH_PROVIDER_WEBHOOK_SECRET), "ACH provider settlement integration is not enabled."),
		smtp,
		calendar,
		cleaning: { status: database.status === "READY" ? "DEGRADED" : "ERROR", detail: "Operational scheduling requires enabled cleaner configuration." } satisfies Check,
		cleanerNotification: configured(Boolean(process.env.TELEGRAM_BOT_TOKEN) || isSmtpConfigured(), "Notification channel requires end-to-end delivery verification."),
		chatwoot: configured(Boolean(process.env.CHATWOOT_WEBHOOK_SECRET), "Webhook secret is present; outbound API configuration is required."),
		ollama: configured(Boolean(process.env.OLLAMA_BASE_URL), "Ollama endpoint is configured but has not been probed."),
		hostTelegram: configured(Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_HOST_CHAT_ID), "Telegram destination is incomplete."),
		n8n: configured(automationConfigured, "Automation secret/base URL are incomplete."),
		weather: { status: "DEGRADED", detail: "NWS availability is checked on demand with fallback." } satisfies Check,
		loyalty: { status: database.status === "READY" ? "READY" : "ERROR" } satisfies Check,
		referral: { status: database.status === "READY" ? "READY" : "ERROR" } satisfies Check
	}
	return NextResponse.json({ checks, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } })
}
