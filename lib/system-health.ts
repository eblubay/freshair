import { ownerAccess } from "@/lib/owner-auth"

export type HealthStatus = "READY" | "DEGRADED" | "ERROR" | "NOT_CONFIGURED" | "DISABLED_BY_DESIGN" | "NOT_REQUIRED" | "OPTIONAL"
export type HealthCheck = { status: HealthStatus; detail: string }

export const CALENDAR_FRESHNESS_HOURS = 3

export function ownerHealthAccess(userId: string | null, configuredOwnerId: string | undefined) {
	return ownerAccess(userId, configuredOwnerId)
}

export function smtpHealth(configured: boolean, successfulDeliveries: number): HealthCheck {
	if (!configured) return { status: "NOT_CONFIGURED", detail: "Outbound email configuration is incomplete." }
	if (successfulDeliveries > 0) return { status: "READY", detail: "Successful outbound delivery is recorded in private application metadata." }
	return { status: "DEGRADED", detail: "SMTP is configured, but no successful outbound delivery is recorded yet." }
}

export function calendarHealth(input: { configured: boolean; lastSuccessfulSync: Date | null; lastSyncSucceeded: boolean | null; now?: Date }): HealthCheck {
	if (!input.configured) return { status: "NOT_CONFIGURED", detail: "No import-only calendar source is configured." }
	if (!input.lastSuccessfulSync) return { status: "DEGRADED", detail: "The configured calendar has no successful sync evidence." }
	const ageMs = (input.now ?? new Date()).getTime() - input.lastSuccessfulSync.getTime()
	if (input.lastSyncSucceeded === false) return { status: "DEGRADED", detail: "The most recent hourly calendar sync attempt failed." }
	if (ageMs > CALENDAR_FRESHNESS_HOURS * 60 * 60_000) return { status: "DEGRADED", detail: `The last successful calendar sync is older than ${CALENDAR_FRESHNESS_HOURS} hours.` }
	return { status: "READY", detail: "Airbnb import-only/read-only sync succeeded within the hourly cron freshness window." }
}

export function telegramHealth(input: { token: boolean; chatId: boolean; webhookSecret: boolean; webhookConnected?: boolean; probeFailed?: boolean }): HealthCheck {
	if (!input.token || !input.chatId || !input.webhookSecret) return { status: "NOT_CONFIGURED", detail: "Host bot token, authorized owner chat, or webhook secret is missing." }
	if (input.probeFailed) return { status: "DEGRADED", detail: "Telegram is configured, but its webhook state could not be verified." }
	if (!input.webhookConnected) return { status: "DEGRADED", detail: "Telegram is configured, but the expected webhook is not connected." }
	return { status: "READY", detail: "Host bot configuration and expected webhook connection are verified." }
}

export function cleaningHealth(input: { databaseReady: boolean; enabled: boolean; cleanerAssigned: boolean }): HealthCheck {
	if (!input.databaseReady) return { status: "ERROR", detail: "Cleaning state cannot be read because the operational database check failed." }
	if (!input.enabled || !input.cleanerAssigned) return { status: "NOT_CONFIGURED", detail: "Owner action required: enable cleaning and assign an active default cleaner in the existing operational settings." }
	return { status: "READY", detail: "Checkout → next confirmed arrival → cleaning deadline scheduling is enabled with an assigned cleaner." }
}

export function cleanerNotificationHealth(input: { channelConfigured: boolean; verifiedDeliveries: number }): HealthCheck {
	if (!input.channelConfigured) return { status: "NOT_CONFIGURED", detail: "Owner action required: the assigned cleaner has no usable notification channel." }
	if (input.verifiedDeliveries < 1) return { status: "DEGRADED", detail: "A cleaner notification channel is configured, but no successful delivery is recorded." }
	return { status: "READY", detail: "A successful cleaner notification delivery is recorded." }
}

export const disabledPayment = (name: string): HealthCheck => ({ status: "DISABLED_BY_DESIGN", detail: `${name} live payments are intentionally off for inquiry/manual-confirmation launch.` })
export const optionalProvider = (detail: string): HealthCheck => ({ status: "OPTIONAL", detail })
