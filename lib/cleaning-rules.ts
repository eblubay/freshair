export type CleaningSettings = {
	timezone: string
	normalCompletionBufferHours: number
	noNextGuestMaxDays: number | null
}

export type Turnover = {
	checkoutDate: string
	checkoutTime: string | null
	nextCheckinDate: string | null
	nextCheckinTime: string | null
}

export type CleaningSchedule = {
	sameDayTurnover: boolean
	noUpcomingArrival: boolean
	priority: "NORMAL" | "HIGH" | "URGENT"
	deadline: Date | null
	windowStart: Date
}

const dateAtLocalTime = (date: string, time: string | null, timezone: string) => {
	const clock = time?.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i)
	let hour = clock ? Number(clock[1]) : 12
	if (clock?.[3]?.toUpperCase() === "PM" && hour < 12) hour += 12
	if (clock?.[3]?.toUpperCase() === "AM" && hour === 12) hour = 0
	const minute = clock ? Number(clock[2]) : 0
	// Dates and default clocks are property-local operational times. The returned
	// Date is only used for ordering/output; database stores an absolute timestamp.
	const offset = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === "timeZoneName")?.value ?? "GMT-00:00"
	const sign = offset.includes("-") ? "-" : "+"
	const numeric = offset.replace("GMT", "").replace("+", "").replace("-", "") || "00:00"
	return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${sign}${numeric}`)
}

const addCalendarDays = (date: string, days: number) => {
	const value = new Date(`${date}T12:00:00Z`)
	value.setUTCDate(value.getUTCDate() + days)
	return value.toISOString().slice(0, 10)
}

export function calculateCleaningSchedule(turnover: Turnover, settings: CleaningSettings): CleaningSchedule {
	const checkout = dateAtLocalTime(turnover.checkoutDate, turnover.checkoutTime, settings.timezone)
	if (!turnover.nextCheckinDate) {
		const deadline = settings.noNextGuestMaxDays === null ? null : dateAtLocalTime(addCalendarDays(turnover.checkoutDate, settings.noNextGuestMaxDays), "23:59", settings.timezone)
		return { sameDayTurnover: false, noUpcomingArrival: true, priority: "NORMAL", deadline, windowStart: checkout }
	}
	const nextArrival = dateAtLocalTime(turnover.nextCheckinDate, turnover.nextCheckinTime, settings.timezone)
	const sameDayTurnover = turnover.checkoutDate === turnover.nextCheckinDate
	if (sameDayTurnover) return { sameDayTurnover, noUpcomingArrival: false, priority: "URGENT", deadline: nextArrival, windowStart: checkout }
	if (addCalendarDays(turnover.checkoutDate, 1) === turnover.nextCheckinDate) return { sameDayTurnover: false, noUpcomingArrival: false, priority: "HIGH", deadline: nextArrival, windowStart: checkout }
	const deadline = dateAtLocalTime(addCalendarDays(turnover.nextCheckinDate, -1), "23:59", settings.timezone)
	deadline.setTime(deadline.getTime() - settings.normalCompletionBufferHours * 3_600_000)
	return { sameDayTurnover: false, noUpcomingArrival: false, priority: "NORMAL", deadline, windowStart: checkout }
}
