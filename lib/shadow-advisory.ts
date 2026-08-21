import { getCalendarStaleMinutes } from "@/lib/launch-config"

export type AirbnbAdvisory = "APPEARS_AVAILABLE" | "APPEARS_UNAVAILABLE" | "UNKNOWN_STALE"
export type CalendarHealth = "FRESH" | "STALE" | "SYNC_FAILED" | "NOT_CONFIGURED"

export function calendarHealth(input: { configured: boolean; lastSuccess: Date | null; lastSyncSuccess: boolean | null }, now = new Date()): CalendarHealth {
	if (!input.configured) return "NOT_CONFIGURED"
	if (input.lastSyncSuccess === false) return "SYNC_FAILED"
	if (!input.lastSuccess || now.getTime() - input.lastSuccess.getTime() > getCalendarStaleMinutes() * 60_000) return "STALE"
	return "FRESH"
}

export function advisoryFromEvents(checkIn: string, checkOut: string, events: Array<{ start: string; end: string }>, health: CalendarHealth): AirbnbAdvisory {
	if (health !== "FRESH") return "UNKNOWN_STALE"
	return events.some((event) => event.start < checkOut && event.end > checkIn) ? "APPEARS_UNAVAILABLE" : "APPEARS_AVAILABLE"
}
