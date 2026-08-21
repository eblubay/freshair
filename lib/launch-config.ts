export const PUBLIC_GUEST_EMAIL = "stay@shellbytheshore.com"

export type BookingMode = "inquiry" | "direct"

/** Launch-safe default: direct booking must be explicitly enabled twice. */
export function getBookingMode(): BookingMode {
	return process.env.BOOKING_MODE?.toLowerCase() === "direct" &&
		process.env.DIRECT_BOOKING_ENABLED === "true"
		? "direct"
		: "inquiry"
}

export function isDirectBookingEnabled(): boolean {
	return getBookingMode() === "direct"
}

export function getCalendarStaleMinutes(): number {
	const value = Number.parseInt(process.env.AIRBNB_CALENDAR_STALE_MINUTES ?? "180", 10)
	return Number.isFinite(value) && value >= 5 ? value : 180
}

export function getCalendarSyncMinutes(): number {
	const value = Number.parseInt(process.env.AIRBNB_ICAL_SYNC_MINUTES ?? "30", 10)
	return Number.isFinite(value) && value >= 10 ? value : 30
}

export function getConfiguredMaxOccupancy(fallback = 4): number {
	const value = Number.parseInt(process.env.MAX_OCCUPANCY ?? String(fallback), 10)
	return Number.isFinite(value) && value >= 1 && value <= 50 ? value : fallback
}
