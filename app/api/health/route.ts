import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { isSmtpConfigured } from "@/lib/postmark"
import { getTelegramWebhookStatus } from "@/lib/telegram-host-api"
import { calendarHealth, cleaningHealth, cleanerNotificationHealth, disabledPayment, type HealthCheck, optionalProvider, ownerHealthAccess, smtpHealth, telegramHealth } from "@/lib/system-health"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
	const { userId } = await auth()
	const access = ownerHealthAccess(userId, process.env.HOST_OWNER_CLERK_USER_ID)
	if (!access.allowed) return NextResponse.json({ error: access.status === 401 ? "Owner authentication is required." : "Owner access is required." }, { status: access.status, headers: { "Cache-Control": "private, no-store" } })
	const [owner] = await queryClient`SELECT id FROM properties WHERE clerk_id=${userId} LIMIT 1`
	if (!owner) return NextResponse.json({ error: "Owner access is required." }, { status: 403, headers: { "Cache-Control": "private, no-store" } })

	let database: HealthCheck = { status: "ERROR", detail: "The operational database check failed." }
	let smtp = smtpHealth(isSmtpConfigured(), 0)
	let calendar = calendarHealth({ configured: Boolean(process.env.AIRBNB_ICAL_URL?.trim()), lastSuccessfulSync: null, lastSyncSucceeded: null })
	let cleaning = cleaningHealth({ databaseReady: false, enabled: false, cleanerAssigned: false })
	let cleanerNotification = cleanerNotificationHealth({ channelConfigured: false, verifiedDeliveries: 0 })
	let loyalty = optionalProvider("Loyalty foundations are installed; customer rewards are not enabled.")
	let referral = optionalProvider("Referral foundations are installed; customer referrals are not enabled.")
	try {
		const [[calendarState], [emailEvidence], [cleaningState], [notificationState], [featureState]] = await Promise.all([
			queryClient`SELECT last_successful_sync,last_sync_success FROM airbnb_calendar_state WHERE source='AIRBNB_ICAL'`,
			queryClient`SELECT count(*)::int AS successful FROM inquiry_messages m JOIN inquiries i ON i.id=m.inquiry_id WHERE i.property_id=${owner.id} AND m.direction='OUTBOUND' AND m.sent_at IS NOT NULL`,
			queryClient`SELECT s.enabled, (c.id IS NOT NULL AND c.active=true) AS cleaner_assigned, c.email, c.telegram_chat_id, c.preferred_channel FROM cleaning_settings s LEFT JOIN cleaners c ON c.id=s.default_cleaner_id WHERE s.property_id=${owner.id}`,
			queryClient`SELECT count(*) FILTER (WHERE e.event_type='CLEANING_NOTIFICATION_SENT' AND e.channel='EMAIL' AND (e.payload->>'recipientConfigured')::boolean=true)::int AS verified FROM cleaning_task_events e JOIN cleaning_tasks t ON t.id=e.task_id WHERE t.property_id=${owner.id}`,
			queryClient`SELECT enabled,welcome_back_enabled,referral_enabled FROM loyalty_settings WHERE property_id=${owner.id}`
		])
		database = { status: "READY", detail: "Operational database connectivity is verified; RLS certification is maintained separately." }
		smtp = smtpHealth(isSmtpConfigured(), Number(emailEvidence?.successful ?? 0))
		calendar = calendarHealth({ configured: Boolean(process.env.AIRBNB_ICAL_URL?.trim()), lastSuccessfulSync: calendarState?.last_successful_sync ? new Date(calendarState.last_successful_sync as string) : null, lastSyncSucceeded: calendarState?.last_sync_success as boolean | null ?? null })
		const cleanerAssigned = Boolean(cleaningState?.cleaner_assigned)
		cleaning = cleaningHealth({ databaseReady: true, enabled: Boolean(cleaningState?.enabled), cleanerAssigned })
		const emailChannel = cleaningState?.preferred_channel === "EMAIL" && Boolean(cleaningState?.email) && isSmtpConfigured()
		const telegramChannel = cleaningState?.preferred_channel === "TELEGRAM" && Boolean(cleaningState?.telegram_chat_id)
		cleanerNotification = cleanerNotificationHealth({ channelConfigured: cleanerAssigned && (emailChannel || telegramChannel), verifiedDeliveries: Number(notificationState?.verified ?? 0) })
		if (featureState?.enabled && featureState?.welcome_back_enabled) loyalty = { status: "READY", detail: "Loyalty rewards are enabled on the operational property." }
		if (featureState?.enabled && featureState?.referral_enabled) referral = { status: "READY", detail: "Referral rewards are enabled on the operational property." }
	} catch {
		// Do not disclose database errors or connection details in the health response.
	}

	let hostTelegram: HealthCheck
	const telegramConfiguration = { token: Boolean(process.env.TELEGRAM_HOST_BOT_TOKEN?.trim()), chatId: Boolean(process.env.TELEGRAM_HOST_CHAT_ID?.trim()), webhookSecret: Boolean(process.env.TELEGRAM_HOST_WEBHOOK_SECRET?.trim()) }
	if (!telegramConfiguration.token || !telegramConfiguration.chatId || !telegramConfiguration.webhookSecret) hostTelegram = telegramHealth(telegramConfiguration)
	else {
		try { const state = await getTelegramWebhookStatus(); hostTelegram = telegramHealth({ ...telegramConfiguration, webhookConnected: state.webhookConfigured }) }
		catch { hostTelegram = telegramHealth({ ...telegramConfiguration, probeFailed: true }) }
	}
	const aiProviderConfigured = Boolean(process.env.OLLAMA_BASE_URL?.trim() || process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim())
	const checks = {
		database,
		inquiryMode: database.status === "READY" ? { status: "READY", detail: "Manual inquiry and owner-confirmation mode is active; an availability request is not a reservation." } : { status: "ERROR", detail: "Inquiry mode cannot be verified because the operational database check failed." },
		smtp,
		calendar,
		cleaning,
		cleanerNotification,
		hostTelegram,
		aiDraft: aiProviderConfigured ? { status: "DEGRADED", detail: "An optional AI provider is configured but provider health is not verified." } : optionalProvider("Provider not configured; owner-written drafts and send-preview flow remain available."),
		ollama: process.env.OLLAMA_BASE_URL?.trim() ? { status: "DEGRADED", detail: "Optional Ollama endpoint is configured but not verified." } : optionalProvider("Ollama is not configured and is not required for launch."),
		n8n: { status: "NOT_REQUIRED", detail: "Launch-critical calendar sync runs through the protected Hostinger hourly cron endpoint." },
		weather: optionalProvider("NWS weather is best-effort and checked on demand; graceful no-weather fallback is functioning by design."),
		braintree: disabledPayment("Braintree"),
		stripe: disabledPayment("Stripe"),
		ach: disabledPayment("ACH"),
		chatwoot: { status: "NOT_REQUIRED", detail: "Chatwoot is not required by the production inquiry and owner-confirmation workflow." },
		loyalty,
		referral
	}
	return NextResponse.json({ checks, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } })
}
