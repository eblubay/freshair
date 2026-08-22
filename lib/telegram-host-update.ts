import "server-only"

import { applyHostAction, authorizedHost, hostActions } from "@/lib/host-bot"
import { queryClient } from "@/lib/db"
import { answerTelegramCallback, parseTelegramCallbackData, sendTelegramHostMessage, telegramCallbackData } from "@/lib/telegram-host-api"
import { z } from "zod"

const updateSchema = z.object({
	update_id: z.number().int(),
	callback_query: z.object({ id: z.string(), from: z.object({ id: z.number() }), data: z.string().optional(), message: z.object({ chat: z.object({ id: z.number() }) }).optional() }).optional(),
	message: z.object({ message_id: z.number().int(), text: z.string().max(5000).optional(), chat: z.object({ id: z.number() }) }).optional()
})

const button = (text: string, action: string, inquiryId: string) => ({ text, callback_data: telegramCallbackData(action, inquiryId) })
const mainActions = (inquiryId: string) => [
	[button("Reply", "REPLY", inquiryId), button("AI Draft", "AI_DRAFT", inquiryId)],
	[button("Set Price", "SET_PRICE", inquiryId), button("Available", "AVAILABLE", inquiryId)],
	[button("Not Available", "NOT_AVAILABLE", inquiryId), button("Mark Replied", "MARK_REPLIED", inquiryId)],
	[button("Guest Confirmed", "GUEST_CONFIRMED", inquiryId), button("Create Booking", "CREATE_BOOKING", inquiryId)]
]

function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100) }
function safeError(error: unknown) {
	const message = error instanceof Error ? error.message : "Operation failed"
	if (/Unauthorized/.test(message)) return "This Telegram chat is not authorized."
	if (/not found/i.test(message)) return "The inquiry could not be found."
	if (/SMTP is not configured/.test(message)) return "Email delivery is not configured."
	return message.slice(0, 240)
}

async function inquirySummary(inquiryId: string) {
	const [inquiry] = await queryClient`SELECT guest_first_name,guest_last_name,check_in,check_out,guests,quoted_amount_minor FROM inquiries WHERE id=${inquiryId}`
	if (!inquiry) throw new Error("Inquiry not found")
	return `Guest: ${[inquiry.guest_first_name, inquiry.guest_last_name].filter(Boolean).join(" ") || "Unknown"}\nDates: ${inquiry.check_in} – ${inquiry.check_out}\nGuests: ${inquiry.guests}\nPrice: ${inquiry.quoted_amount_minor == null ? "Not set" : money(Number(inquiry.quoted_amount_minor))}`
}

async function renderResult(chatId: string, inquiryId: string, result: Record<string, any>) {
	if (result.duplicate) return
	if (result.state === "AWAITING_REPLY") return sendTelegramHostMessage(chatId, result.prompt || "Type your reply to the guest.")
	if (result.state === "READY_TO_SEND") return sendTelegramHostMessage(chatId, result.text, [[button("SEND EMAIL", "SEND_EMAIL", inquiryId), button("EDIT", "EDIT", inquiryId), button("CANCEL", "CANCEL", inquiryId)]])
	if (result.state === "UNAVAILABLE") return sendTelegramHostMessage(chatId, result.message || "AI Draft is currently disabled.")
	if (result.state === "AWAITING_PRICE") return sendTelegramHostMessage(chatId, "Enter the total quoted price in USD.")
	if (result.state === "QUOTE_SAVED") return sendTelegramHostMessage(chatId, `PRICE SAVED\n${money(Number(result.amountMinor))}`, [[button("Reply", "REPLY", inquiryId), button("AI Draft", "AI_DRAFT", inquiryId), button("Clear Price", "CLEAR_PRICE", inquiryId)]])
	if (result.state === "PRICE_CLEARED") return sendTelegramHostMessage(chatId, "Price cleared.", mainActions(inquiryId))
	if (result.state === "OWNER_VERIFIED_AVAILABLE") return sendTelegramHostMessage(chatId, "Availability marked AVAILABLE after owner verification.\n\nMANUAL VERIFICATION REQUIRED.", mainActions(inquiryId))
	if (result.state === "OWNER_VERIFIED_NOT_AVAILABLE") return sendTelegramHostMessage(chatId, "Availability marked NOT AVAILABLE.\n\nMANUAL VERIFICATION REQUIRED.", mainActions(inquiryId))
	if (result.state === "REPLIED") return sendTelegramHostMessage(chatId, "Marked replied. No email was sent.", mainActions(inquiryId))
	if (result.state === "CONFIRM_MANUAL_STAY") return sendTelegramHostMessage(chatId, `CONFIRM STAY?\n\n${await inquirySummary(inquiryId)}`, [[button("CONFIRM", "CONFIRM_GUEST", inquiryId), button("CANCEL", "CANCEL", inquiryId)]])
	if (result.state === "CONFIRMED_MANUAL") return sendTelegramHostMessage(chatId, "Guest stay confirmed operationally. Payment remains UNPAID.", mainActions(inquiryId))
	if (result.state === "CREATE_BOOKING_PREVIEW") return sendTelegramHostMessage(chatId, `CREATE INTERNAL BOOKING?\n\n${await inquirySummary(inquiryId)}\n\nNo payment will be captured.`, [[button("CONFIRM", "CONFIRM_CREATE_BOOKING", inquiryId), button("CANCEL", "CANCEL", inquiryId)]])
	if (result.state === "BOOKING_CREATED") return sendTelegramHostMessage(chatId, "Internal ShellByTheShore booking created. Payment remains UNPAID.")
	if (result.state === "EMAIL_SENT") return sendTelegramHostMessage(chatId, "EMAIL SENT to the guest.", mainActions(inquiryId))
	if (result.state === "CANCELLED") return sendTelegramHostMessage(chatId, "Action cancelled.", mainActions(inquiryId))
	return sendTelegramHostMessage(chatId, "Action completed.", mainActions(inquiryId))
}

export async function processTelegramHostUpdate(input: unknown) {
	const update = updateSchema.parse(input)
	const callback = update.callback_query
	const message = update.message
	const chatId = String(callback?.message?.chat.id ?? message?.chat.id ?? callback?.from.id ?? "")
	if (!authorizedHost(chatId)) {
		if (callback) await answerTelegramCallback(callback.id, "Unauthorized chat").catch(() => undefined)
		throw new Error("Unauthorized host chat")
	}

	if (callback) {
		await answerTelegramCallback(callback.id, "Processing…").catch(() => undefined)
		const parsed = parseTelegramCallbackData(callback.data || "")
		if (!parsed || !hostActions.includes(parsed.action as never)) throw new Error("Invalid button action")
		try {
			const result = await applyHostAction({ updateId: String(update.update_id), chatId, inquiryId: parsed.inquiryId, action: parsed.action })
			await renderResult(chatId, parsed.inquiryId, result)
			return { ok: true }
		} catch (error) {
			await sendTelegramHostMessage(chatId, `Unable to complete action: ${safeError(error)}`).catch(() => undefined)
			return { ok: true }
		}
	}

	if (message?.text) {
		const [inquiry] = await queryClient`SELECT id,telegram_state FROM inquiries WHERE telegram_state IN ('AWAITING_REPLY','AWAITING_PRICE') ORDER BY updated_at DESC LIMIT 1`
		if (!inquiry) { await sendTelegramHostMessage(chatId, "No Reply or Set Price action is currently waiting for text."); return { ok: true } }
		const action = inquiry.telegram_state === "AWAITING_PRICE" ? "PRICE_TEXT" : "REPLY_TEXT"
		try {
			const result = await applyHostAction({ updateId: String(update.update_id), chatId, inquiryId: String(inquiry.id), action, text: message.text })
			await renderResult(chatId, String(inquiry.id), result)
		} catch (error) { await sendTelegramHostMessage(chatId, `Unable to accept message: ${safeError(error)}`).catch(() => undefined) }
	}
	return { ok: true }
}
