import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("owner settings resolves and binds the existing property before reading settings", () => {
	const page = read("app/dashboard/settings/page.tsx")
	assert.match(page, /await ensureOwnerPropertySettings\(userId\)/)
	assert.ok(page.indexOf("ensureOwnerPropertySettings(userId)") < page.indexOf("SELECT p.id"))
	assert.match(page, /ownerAccess\(userId\)/)
})

test("property binding never creates a duplicate property", () => {
	const binding = read("lib/owner-property-settings.ts")
	assert.match(binding, /SELECT id FROM properties ORDER BY created_at LIMIT 2 FOR UPDATE/)
	assert.match(binding, /existing\.length !== 1/)
	assert.doesNotMatch(binding, /INSERT INTO properties|DELETE FROM properties/)
})

test("missing booking settings initialize idempotently for only the resolved property", () => {
	const binding = read("lib/owner-property-settings.ts")
	assert.match(binding, /INSERT INTO booking_settings \(property_id\)/)
	assert.match(binding, /ON CONFLICT \(property_id\) DO NOTHING/)
	assert.doesNotMatch(binding, /UPDATE booking_settings|DELETE FROM booking_settings/)
})

test("binding preserves public listing identity, URL, content, photos, and inquiry data", () => {
	const binding = read("lib/owner-property-settings.ts")
	assert.match(binding, /UPDATE properties SET clerk_id=/)
	assert.doesNotMatch(binding, /SET (?:id|url|listing_data|price_per_night|views|inquiries)=/)
	assert.doesNotMatch(binding, /scrap|apify|queueScraping/i)
	assert.doesNotMatch(read("app/listing/[id]/page.tsx"), /ensureOwnerPropertySettings/)
})

test("unauthorized users cannot trigger property rebinding", () => {
	const page = read("app/dashboard/settings/page.tsx")
	assert.ok(page.indexOf("if (!access.allowed) notFound()") < page.indexOf("ensureOwnerPropertySettings(userId)"))
	assert.match(read("middleware.ts"), /request\.nextUrl\.pathname\.startsWith\("\/dashboard"\)/)
})
