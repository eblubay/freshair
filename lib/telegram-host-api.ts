import "server-only"
import { resolveHostTelegramEnvironment } from "@/lib/telegram-env"

const CALLBACK_PATH = "/api/telegram/host/callback"
const PRODUCTION_ORIGIN = "https://shellbytheshore.com"

type TelegramEnvelope<T> = { ok: boolean; result?: T; description?: string }
export type TelegramWebhookStatus = {
	telegramConfigured: boolean
	webhookConfigured: boolean
	webhookUrl: string
	pending_update_count: number
	last_error_date: number | null
	last_error_message: string | null
}

export function telegramWebhookUrl(siteUrl = resolveHostTelegramEnvironment().siteUrl) {
	const normalized = siteUrl?.trim().replace(/\/+$/, "")
	if (!normalized && process.env.NODE_ENV === "production") return `${PRODUCTION_ORIGIN}${CALLBACK_PATH}`
	if (!normalized) return ""
	const parsed = new URL(normalized)
	if (process.env.NODE_ENV === "production" && parsed.origin !== PRODUCTION_ORIGIN)
		throw new Error("Production SITE_URL must use the canonical ShellByTheShore origin")
	return `${parsed.origin}${CALLBACK_PATH}`
}

function configuration() {
	const { token } = resolveHostTelegramEnvironment()
	return { token, webhookUrl: telegramWebhookUrl() }
}

async function telegramRequest<T>(method: string, body?: Record<string, unknown>): Promise<TelegramEnvelope<T>> {
	const { token } = configuration()
	if (!token) throw new Error("Telegram host bot is not configured")
	const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body ?? {}),
		cache: "no-store"
	})
	const payload = await response.json().catch(() => ({ ok: false })) as TelegramEnvelope<T>
	if (!response.ok || !payload.ok) throw new Error(payload.description || "Telegram API request failed")
	return payload
}

export async function getTelegramWebhookStatus(): Promise<TelegramWebhookStatus> {
	const { token, webhookUrl } = configuration()
	if (!token) return { telegramConfigured: false, webhookConfigured: false, webhookUrl, pending_update_count: 0, last_error_date: null, last_error_message: null }
	const payload = await telegramRequest<{ url?: string; pending_update_count?: number; last_error_date?: number; last_error_message?: string }>("getWebhookInfo")
	const info = payload.result ?? {}
	return {
		telegramConfigured: true,
		webhookConfigured: Boolean(webhookUrl && info.url === webhookUrl),
		webhookUrl: info.url || webhookUrl,
		pending_update_count: Number(info.pending_update_count || 0),
		last_error_date: info.last_error_date ?? null,
		last_error_message: info.last_error_message ?? null
	}
}

export async function setupTelegramWebhook(): Promise<TelegramWebhookStatus> {
	const { webhookUrl } = configuration()
	const secretToken = resolveHostTelegramEnvironment().webhookSecret
	if (!secretToken) throw new Error("Telegram webhook secret is not configured")
	if (!webhookUrl || !webhookUrl.startsWith("https://")) throw new Error("SITE_URL must be configured with an HTTPS URL")
	await telegramRequest("setWebhook", { url: webhookUrl, secret_token: secretToken, allowed_updates: ["callback_query", "message"], drop_pending_updates: false })
	return getTelegramWebhookStatus()
}

export async function sendTelegramHostMessage(chatId: string, text: string, keyboard?: Array<Array<{ text: string; callback_data: string }>>) {
	return telegramRequest("sendMessage", { chat_id: chatId, text: text.slice(0, 4096), ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) })
}

export async function answerTelegramCallback(callbackQueryId: string, text?: string) {
	return telegramRequest("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text: text.slice(0, 200) } : {}) })
}

export function telegramCallbackData(action: string, inquiryId: string) { return `${action}:${inquiryId}` }

export function parseTelegramCallbackData(value: string) {
	const separator = value.indexOf(":")
	if (separator < 1) return null
	const action = value.slice(0, separator)
	const inquiryId = value.slice(separator + 1)
	return action && inquiryId && value.length <= 64 ? { action, inquiryId } : null
}
