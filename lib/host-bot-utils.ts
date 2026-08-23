import { resolveHostTelegramEnvironment } from "@/lib/telegram-env"

export const hostActions = ["REPLY", "REPLY_TEXT", "AI_DRAFT", "SEND_EMAIL", "SEND_DRAFT", "EDIT", "SET_PRICE", "PRICE_TEXT", "CLEAR_PRICE", "AVAILABLE", "NOT_AVAILABLE", "MARK_REPLIED", "GUEST_CONFIRMED", "CONFIRM_GUEST", "CREATE_BOOKING", "CONFIRM_CREATE_BOOKING", "CANCEL", "AIRBNB_STAY_CONFIRMED", "BLOCKED_DATES_ONLY", "IGNORE"] as const
export function authorizedHost(chatId: string) { const configuredChatId = resolveHostTelegramEnvironment().chatId; return Boolean(configuredChatId) && chatId === configuredChatId }
export function dollarsToMinor(value: string): number | null { if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim())) return null; const [whole, cents = ""] = value.trim().split("."); return Number(whole) * 100 + Number(cents.padEnd(2, "0")) }
export function classifyUrgency(content: string) { const value = content.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); return /cannot enter|door code not working|locked out|water leak|flooding|no power|smoke|fire|emergency/.test(value) ? "HIGH" : "NORMAL" }

export function replyPreview(email: string, reference: string, draft: string) {
	return {
		state: "READY_TO_SEND" as const,
		text: `READY TO SEND\n\nTo: ${email}\nSubject: Re: ShellByTheShore Availability — ${reference}\n\n${draft}`,
		buttons: ["SEND EMAIL", "EDIT", "CANCEL"] as const
	}
}
