import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { advisoryFromEvents, calendarHealth } from "../lib/shadow-advisory"
import { getBookingMode, PUBLIC_GUEST_EMAIL } from "../lib/launch-config"

const valid = { propertyId: "property", checkIn: "2099-09-10", checkOut: "2099-09-14", guests: 3, firstName: "John", lastName: "Smith", email: "john@example.com", phone: "", message: "Question", website: "", idempotencyKey: "123e4567-e89b-12d3-a456-426614174000" }

test("inquiry validation is server-side Zod", () => { const action = readFileSync("lib/bookings.ts", "utf8"); const validation = readFileSync("lib/inquiry-validation.ts", "utf8"); assert.match(action, /inquirySchema\.safeParse/); assert.match(validation, /inquirySchema = z\.object/); assert.match(validation, /\.email\(/); assert.match(action, /checkOut <= checkIn/); assert.match(action, /checkIn < today/) })

test("use server modules export only async functions", () => {
	for (const path of ["lib/bookings.ts", "lib/properties.ts"]) {
		const source = readFileSync(path, "utf8")
		assert.match(source, /^["']use server["']/)
		assert.doesNotMatch(source, /export\s+(?:const|let|var|class|enum)\s+/)
		assert.doesNotMatch(source, /export\s*\{[^}]+\}/)
		for (const match of source.matchAll(/export\s+(?:default\s+)?function\s+(\w+)/g)) assert.match(match[0], /async\s+function/, `${path}: ${match[1]} must be async`)
	}
})

test("Request Availability imports a single valid server action and keeps schema in a normal module", () => {
	const component = readFileSync("app/_components/AvailabilityRequest.tsx", "utf8")
	const action = readFileSync("lib/bookings.ts", "utf8")
	assert.match(component, /import \{ requestAvailability \} from "@\/lib\/bookings"/)
	assert.match(action, /export async function requestAvailability/)
	assert.doesNotMatch(action, /export const inquirySchema/)
})

test("inquiry mode is the launch-safe default", () => {
	const previousMode = process.env.BOOKING_MODE; const previousFlag = process.env.DIRECT_BOOKING_ENABLED
	delete process.env.BOOKING_MODE; delete process.env.DIRECT_BOOKING_ENABLED
	assert.equal(getBookingMode(), "inquiry")
	process.env.BOOKING_MODE = "direct"; process.env.DIRECT_BOOKING_ENABLED = "false"
	assert.equal(getBookingMode(), "inquiry")
	if (previousMode === undefined) delete process.env.BOOKING_MODE; else process.env.BOOKING_MODE = previousMode
	if (previousFlag === undefined) delete process.env.DIRECT_BOOKING_ENABLED; else process.env.DIRECT_BOOKING_ENABLED = previousFlag
})

test("calendar advisory uses overlap but never returns authoritative AVAILABLE", () => {
	assert.equal(advisoryFromEvents("2099-09-10", "2099-09-14", [{ start: "2099-09-12", end: "2099-09-15" }], "FRESH"), "APPEARS_UNAVAILABLE")
	assert.equal(advisoryFromEvents("2099-09-10", "2099-09-14", [], "FRESH"), "APPEARS_AVAILABLE")
	assert.equal(advisoryFromEvents("2099-09-10", "2099-09-14", [], "STALE"), "UNKNOWN_STALE")
})

test("missing calendar configuration is safe", () => assert.equal(calendarHealth({ configured: false, lastSuccess: null, lastSyncSuccess: null }), "NOT_CONFIGURED"))

test("public email and inquiry-only language are present", () => {
	assert.equal(PUBLIC_GUEST_EMAIL, "stay@shellbytheshore.com")
	const source = readFileSync("app/_components/AvailabilityRequest.tsx", "utf8")
	assert.match(source, /does not create\s*or confirm a reservation/)
	assert.doesNotMatch(source, /Dates Available|Instant Book/)
})

test("direct endpoints are feature-gated and inquiry path creates no reservation/payment", () => {
	for (const path of ["app/api/bookings/quote/route.ts", "app/api/bookings/hold/route.ts"]) assert.match(readFileSync(path, "utf8"), /isDirectBookingEnabled/)
	const source = readFileSync("lib/bookings.ts", "utf8")
	assert.doesNotMatch(source, /insert\(reservations\)|INSERT INTO reservations|INSERT INTO payments/)
})

test("Airbnb integration is pull-only and keeps removed history", () => {
	const source = readFileSync("lib/airbnb-shadow.ts", "utf8")
	assert.match(source, /fetch\(url/)
	assert.match(source, /removed_from_feed_at/)
	assert.doesNotMatch(source, /method:\s*["'](?:PUT|PATCH|DELETE|POST)["']/)
})

test("unverified Airbnb blocks never become operational reservations", () => {
	const source = readFileSync("lib/host-bot.ts", "utf8")
	const bridge = source.slice(source.indexOf('data.action === "AIRBNB_STAY_CONFIRMED"'))
	assert.doesNotMatch(bridge.slice(0, bridge.indexOf("await tx`INSERT INTO telegram_interactions")), /data\.action === "UNKNOWN_BLOCK"/)
	assert.match(source, /BLOCKED_DATES_ONLY.*owner_classification/s)
})

test("verified Airbnb stays use imported dates and trigger Cleaning Bot recalculation", () => {
	const source = readFileSync("lib/host-bot.ts", "utf8")
	assert.match(source, /shadow\.start_at/)
	assert.match(source, /shadow\.end_at/)
	assert.match(source, /AIRBNB_STAY_VERIFIED/)
	assert.match(source, /recalculateCleaningForReservationChange/)
	assert.match(readFileSync("lib/cleaning-domain.ts", "utf8"), /booking_source IN \('DIRECT_MANUAL','AIRBNB'/)
})

test("pre-arrival messaging excludes reservations with missing guest identity", () => {
	const source = readFileSync("lib/pre-arrival-automation.ts", "utf8")
	assert.match(source, /NULLIF\(trim\(r\.guest_first_name\),' '\)|NULLIF\(trim\(r\.guest_first_name\),''\)/)
	assert.match(source, /NULLIF\(trim\(r\.guest_email\),''\)/)
})
