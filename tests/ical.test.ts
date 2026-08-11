import assert from "node:assert/strict"
import test from "node:test"
import { parseIcalEvents } from "@/lib/ical"

test("imports all-day OTA event and retains its UID", () => {
	const events = parseIcalEvents("BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:airbnb-abc\r\nDTSTART;VALUE=DATE:20260910\r\nDTEND;VALUE=DATE:20260913\r\nSUMMARY:Reserved\r\nSEQUENCE:2\r\nEND:VEVENT\r\nEND:VCALENDAR")
	assert.equal(events.length, 1)
	assert.deepEqual(events[0] && { uid: events[0].uid, checkIn: events[0].checkIn, checkOut: events[0].checkOut, sequence: events[0].sequence }, { uid: "airbnb-abc", checkIn: "2026-09-10", checkOut: "2026-09-13", sequence: 2 })
})

test("skips malformed and zero-night calendar events", () => {
	const events = parseIcalEvents("BEGIN:VEVENT\nUID:bad\nDTSTART:20260910\nDTEND:20260910\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART:20260912\nDTEND:20260914\nEND:VEVENT")
	assert.equal(events.length, 0)
})

test("unfolds continuation lines without fabricating bookings", () => {
	const events = parseIcalEvents("BEGIN:VEVENT\nUID:generic-1\nDTSTART;VALUE=DATE:20260910\nDTEND;VALUE=DATE:20260912\nSUMMARY:Reserved\n unit\nEND:VEVENT")
	assert.equal(events[0]?.summary, "Reservedunit")
})
