import type { ConversationTurn } from "@/lib/concierge-types"

export const BOOKING_DISCLOSURE = "Request Availability is only an inquiry and does not create a reservation. Availability, terms and acceptance are confirmed manually by the host."
export const UNKNOWN_FALLBACK = "I don't have a verified answer for that yet. The host can confirm it."
export const LIVE_FALLBACK = "That can change in real time. Check the current information directly before heading out."
const injection = /ignore (all |any )?(previous|prior|above)|system prompt|developer (message|instructions)|act as (an )?(admin|administrator)|api[ _-]?key|environment variables?|database (password|credentials)|webhook secret|clerk id|telegram (token|config)|owner.?s? database|\bdoor (code|access)\b|\block code\b|\baccess code\b|security code|wifi password|cleaner (contact|phone)|internal notes?|filesystem|read (a |the )?file/i
const urlRequest = /(fetch|open|request|download|curl|visit)\s+(https?:\/\/|www\.)/i
const booking = /available|availability|book|booking|reservation|reserved|confirm|payment|pay|price|discount|cancel|refund|extend|modify/i
const live = /today|tonight|right now|open now|currently|current|latest|traffic|weather|live|availability|hours?/i
const emergency = /\bemergency\b|call 911|\b(?:there is|there's|active|house|building|kitchen|electrical|wild) fire\b|medical emergency|life.?threat|in danger|drowning/i

export function safetyIntent(question: string) {
	if (injection.test(question) || urlRequest.test(question)) return "security" as const
	if (emergency.test(question)) return "emergency" as const
	if (booking.test(question)) return "booking" as const
	if (live.test(question)) return "live" as const
	return "normal" as const
}
export function validHistory(value: unknown): value is ConversationTurn[] { return Array.isArray(value) && value.length <= 8 && value.every((item) => item && typeof item === "object" && ((item as any).role === "user" || (item as any).role === "assistant") && typeof (item as any).content === "string" && (item as any).content.length <= 1200) }
