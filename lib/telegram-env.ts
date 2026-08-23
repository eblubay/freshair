export type TelegramEnvironment = Record<string, string | undefined>

const firstConfigured = (environment: TelegramEnvironment, names: readonly string[]) => {
	for (const name of names) {
		const value = environment[name]?.trim()
		if (value) return value
	}
	return undefined
}

/** Canonical names win; aliases preserve credentials stored under names used by older revisions. */
export function resolveHostTelegramEnvironment(environment: TelegramEnvironment = process.env) {
	return {
		token: firstConfigured(environment, ["TELEGRAM_HOST_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"]),
		chatId: firstConfigured(environment, ["TELEGRAM_HOST_CHAT_ID", "TELEGRAM_CHAT_ID"]),
		webhookSecret: firstConfigured(environment, ["TELEGRAM_HOST_WEBHOOK_SECRET", "TELEGRAM_CALLBACK_SECRET"]),
		siteUrl: firstConfigured(environment, ["SITE_URL", "NEXT_PUBLIC_SITE_URL"])
	}
}
