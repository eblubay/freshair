import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8")

test("legal pages expose truthful disclosures", () => {
	const privacy = read("app/privacy-policy/page.tsx")
	const terms = read("app/terms-and-conditions/page.tsx")
	const accessibility = read("app/accessibility/page.tsx")
	for (const source of [privacy, terms, accessibility]) assert.match(source, /LegalPage/)
	assert.match(privacy, /do not store raw credit or debit card numbers or CVV/i)
	assert.doesNotMatch(`${privacy}${terms}${accessibility}`, /STR permit|STR license|wheelchair accessible|fully ADA compliant|WCAG certified/i)
})

test("booking consent is mandatory and versioned", () => {
	const booking = read("lib/booking-domain.ts")
	const holdRoute = read("app/api/bookings/hold/route.ts")
	assert.match(booking, /termsAccepted: z\.literal\(true\)/)
	assert.match(booking, /INSERT INTO booking_consents/)
	assert.match(holdRoute, /privacyAcknowledged: z\.literal\(true\)/)
})

test("footer exposes legal choices without invented licensing", () => {
	const footer = read("app/_components/SiteFooter.tsx")
	for (const href of ["/privacy-policy", "/terms-and-conditions", "/accessibility", "/privacy-choices"]) assert.match(footer, new RegExp(href))
	assert.match(footer, /REQUIRED BEFORE LIVE/)
	assert.doesNotMatch(footer, /permit|license/i)
})

test("private routes remain noindex and legal base URL is configured", () => {
	assert.match(read("app/guest/page.tsx"), /index: false/)
	assert.match(read("app/dashboard/page.tsx"), /index: false/)
	assert.match(read("app/layout.tsx"), /metadataBase/)
	assert.match(read("app/layout.tsx"), /isProductionCanonical/)
})
