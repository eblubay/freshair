import "server-only"

type HandoffNotification = { conversationId: string; reason: "HOST_REQUEST" | "QUESTION_THRESHOLD" }

function chatwootBaseUrl() { return (process.env.CHATWOOT_BASE_URL ?? "").replace(/\/$/, "") }

export async function notifyHostOfChatwootHandoff(input: HandoffNotification) {
	const baseUrl = chatwootBaseUrl()
	const accountId = process.env.CHATWOOT_ACCOUNT_ID
	const chatwootToken = process.env.CHATWOOT_API_ACCESS_TOKEN
	const telegramToken = process.env.TELEGRAM_BOT_TOKEN
	const telegramChatId = process.env.TELEGRAM_HOST_CHAT_ID
	const conversationUrl = baseUrl && accountId ? `${baseUrl}/app/accounts/${accountId}/conversations/${input.conversationId}` : null
	const text = `ShellByTheShore guest conversation needs a host (${input.reason === "HOST_REQUEST" ? "requested a person" : "question threshold reached"}).${conversationUrl ? ` ${conversationUrl}` : ""}`
	const results = { chatwoot: false, telegram: false }
	if (baseUrl && accountId && chatwootToken) {
		const response = await fetch(`${baseUrl}/api/v1/accounts/${accountId}/conversations/${input.conversationId}/messages`, {
			method: "POST",
			headers: { "Content-Type": "application/json", api_access_token: chatwootToken },
			body: JSON.stringify({ content: "A host has been notified and will reply as soon as possible.", message_type: "outgoing", private: false }),
			signal: AbortSignal.timeout(10_000)
		})
		results.chatwoot = response.ok
	}
	if (telegramToken && telegramChatId) {
		const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: telegramChatId, text, disable_web_page_preview: true }),
			signal: AbortSignal.timeout(10_000)
		})
		results.telegram = response.ok
	}
	return results
}
