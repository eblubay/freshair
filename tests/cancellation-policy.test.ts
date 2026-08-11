import assert from "node:assert/strict"
import test from "node:test"
import { calculateCancellation } from "@/lib/cancellation-policy"

const checkIn = new Date("2026-09-20T22:00:00.000Z") // 3 PM America/Los_Angeles daylight time
const base = (daysBefore: number, confirmedAt = new Date("2026-09-01T12:00:00.000Z")) => calculateCancellation({ confirmedAt, checkInAt: checkIn, requestedAt: new Date(checkIn.getTime() - daysBefore * 86_400_000), nightlyCharges: 100_000, fees: 10_000, taxes: 9_000, amountPaid: 119_000, timezone: "America/Los_Angeles", fullRefundDays: 14, partialRefundStartDays: 7, partialRefundPercentage: 50, lateCancellationRefundPercentage: 0, feeRefundConfigured: false, taxRefundConfigured: false })

test("verified cancellation boundaries use integer nightly refunds", () => {
	assert.equal(base(15).accommodationRefundAmount, 100_000)
	assert.equal(base(14).tier, "FULL")
	assert.equal(base(10).accommodationRefundAmount, 50_000)
	assert.equal(base(7).tier, "PARTIAL")
	assert.equal(base(6).accommodationRefundAmount, 0)
})

test("California 24-hour override applies only to bookings made 72 hours ahead", () => {
	const eligible = calculateCancellation({ confirmedAt: new Date("2026-09-10T12:00:00.000Z"), checkInAt: checkIn, requestedAt: new Date("2026-09-11T11:59:00.000Z"), nightlyCharges: 100_000, fees: 0, taxes: 0, amountPaid: 100_000, timezone: "America/Los_Angeles", fullRefundDays: 14, partialRefundStartDays: 7, partialRefundPercentage: 50, lateCancellationRefundPercentage: 0, feeRefundConfigured: false, taxRefundConfigured: false })
	assert.equal(eligible.tier, "CALIFORNIA_24_HOUR")
	const late = calculateCancellation({ confirmedAt: new Date(checkIn.getTime() - 71 * 3_600_000), checkInAt: checkIn, requestedAt: new Date(checkIn.getTime() - 70 * 3_600_000), nightlyCharges: 100_000, fees: 0, taxes: 0, amountPaid: 100_000, timezone: "America/Los_Angeles", fullRefundDays: 14, partialRefundStartDays: 7, partialRefundPercentage: 50, lateCancellationRefundPercentage: 0, feeRefundConfigured: false, taxRefundConfigured: false })
	assert.notEqual(late.tier, "CALIFORNIA_24_HOUR")
})

test("unconfigured fees and taxes are not invented and smoking is not auto-captured", () => {
	const quote = base(15)
	assert.equal(quote.feeRefundAmount, 0)
	assert.equal(quote.taxRefundAmount, 0)
	assert.match(require("node:fs").readFileSync("app/terms-and-conditions/page.tsx", "utf8"), /not automatically charged/i)
})

test("verified house rules and 3 PM local check-in are presented without Airbnb service-fee language", () => {
	const source = require("node:fs").readFileSync("app/_components/DirectBooking.tsx", "utf8")
	for (const value of ["Check-in after 3:00 PM", "Checkout before 10:00 AM", "Maximum 4 guests", "No pets", "10:00 PM–8:00 AM", "74 inches"]) assert.match(source, new RegExp(value))
	assert.doesNotMatch(source, /Airbnb service fee/i)
})
