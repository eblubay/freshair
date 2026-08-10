import assert from "node:assert/strict"
import test from "node:test"
import { calculateCleaningSchedule } from "../lib/cleaning-rules"

const settings = { timezone: "America/Los_Angeles", normalCompletionBufferHours: 0, noNextGuestMaxDays: null }

test("normal turnover is due on the day before the next arrival", () => {
	const result = calculateCleaningSchedule({ checkoutDate: "2026-08-18", checkoutTime: "11:00 AM", nextCheckinDate: "2026-08-21", nextCheckinTime: "4:00 PM" }, settings)
	assert.equal(result.sameDayTurnover, false)
	assert.equal(result.priority, "NORMAL")
	assert.equal(result.deadline?.getTime(), new Date("2026-08-20T23:59:00-07:00").getTime())
})

test("same-day turnover is urgent and uses the exact arrival deadline", () => {
	const result = calculateCleaningSchedule({ checkoutDate: "2026-08-18", checkoutTime: "11:00 AM", nextCheckinDate: "2026-08-18", nextCheckinTime: "4:00 PM" }, settings)
	assert.equal(result.sameDayTurnover, true)
	assert.equal(result.priority, "URGENT")
	assert.equal(result.deadline?.getTime(), new Date("2026-08-18T16:00:00-07:00").getTime())
})

test("next-day arrival is high priority and due before check-in", () => {
	const result = calculateCleaningSchedule({ checkoutDate: "2026-08-18", checkoutTime: "11:00 AM", nextCheckinDate: "2026-08-19", nextCheckinTime: "4:00 PM" }, settings)
	assert.equal(result.sameDayTurnover, false)
	assert.equal(result.priority, "HIGH")
	assert.equal(result.deadline?.getTime(), new Date("2026-08-19T16:00:00-07:00").getTime())
})

test("no next arrival does not invent a deadline", () => {
	const result = calculateCleaningSchedule({ checkoutDate: "2026-08-18", checkoutTime: null, nextCheckinDate: null, nextCheckinTime: null }, settings)
	assert.equal(result.noUpcomingArrival, true)
	assert.equal(result.deadline, null)
})

test("owner-configured no-arrival maximum delay produces an explicit operational deadline", () => {
	const result = calculateCleaningSchedule({ checkoutDate: "2026-08-18", checkoutTime: null, nextCheckinDate: null, nextCheckinTime: null }, { ...settings, noNextGuestMaxDays: 2 })
	assert.equal(result.deadline?.getTime(), new Date("2026-08-20T23:59:00-07:00").getTime())
})
