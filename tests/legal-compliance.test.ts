import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"

import { GET as robotsResponse } from "../app/robots.txt/route"

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
	assert.match(footer, /mailto:stay@shellbytheshore\.com/)
	assert.doesNotMatch(footer, /permit|license/i)
})

test("private routes remain noindex and legal base URL is configured", () => {
	assert.match(read("app/guest/page.tsx"), /index: false/)
	assert.match(read("app/dashboard/page.tsx"), /index: false/)
	assert.match(read("app/layout.tsx"), /metadataBase/)
	assert.match(read("app/layout.tsx"), /isProductionCanonical/)
})

test("staging is blocked from indexing and production has a controlled sitemap", () => {
	const sitemap = readFileSync("app/sitemap.ts", "utf8")
	const middleware = readFileSync("middleware.ts", "utf8")
	assert.match(sitemap, /https:\/\/shellbytheshore\.com/)
	assert.match(middleware, /hostingersite\.com/)
	assert.match(middleware, /X-Robots-Tag/)
})

test("privacy policy describes host AI drafts and external transmission truthfully", () => {
	const policy = readFileSync("app/privacy-policy/page.tsx", "utf8")
	assert.match(policy, /No external host-draft AI provider is currently configured/)
	assert.match(policy, /sending always requires a separate owner action/)
	assert.match(policy, /not automatic/)
})

test("public inquiry and terms use the required non-reservation disclosure", () => {
	const inquiry = readFileSync("app/_components/AvailabilityRequest.tsx", "utf8")
	const terms = readFileSync("app/terms-and-conditions/page.tsx", "utf8")
	const disclosure = "Request Availability is only an inquiry and does not create a reservation. Availability, terms and acceptance are confirmed manually by the host."
	assert.match(inquiry.replace(/\s+/g, " "), new RegExp(disclosure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
	assert.match(terms.replace(/\s+/g, " "), new RegExp(disclosure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})

test("a generic Clerk account cannot self-provision operational ownership", () => {
	const properties = readFileSync("lib/properties.ts", "utf8")
	assert.match(properties, /HOST_OWNER_CLERK_USER_ID/)
	assert.match(properties, /userId !== configuredOwnerId/)
	assert.match(properties, /Owner access is required/)
})

test("owner routes enforce the configured Clerk owner at the server boundary", () => {
	const middleware = readFileSync("middleware.ts", "utf8")
	assert.match(middleware, /const ownerPath/)
	assert.match(middleware, /HOST_OWNER_CLERK_USER_ID/)
	assert.match(middleware, /userId !== configuredOwnerId/)
	assert.match(middleware, /status: 403/)
})

test("staging robots blocks every crawler and emits a noindex response header", async () => {
	const response = robotsResponse(new Request("https://origin.internal/robots.txt", {
		headers: {
			host: "origin.internal",
			"x-forwarded-host": "dodgerblue-caribou-367252.hostingersite.com"
		}
	}))
	assert.equal(await response.text(), "User-agent: *\nDisallow: /\n")
	assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive")
	assert.match(response.headers.get("cache-control") ?? "", /no-store/)
})

test("a staging Host header cannot be overridden into public robots behavior", async () => {
	const response = robotsResponse(new Request("https://dodgerblue-caribou-367252.hostingersite.com/robots.txt", {
		headers: {
			host: "dodgerblue-caribou-367252.hostingersite.com",
			"x-forwarded-host": "shellbytheshore.com"
		}
	}))
	assert.equal(await response.text(), "User-agent: *\nDisallow: /\n")
	assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive")
})

test("production robots remains publicly indexable with private paths excluded", async () => {
	const response = robotsResponse(new Request("https://shellbytheshore.com/robots.txt"))
	const body = await response.text()
	assert.match(body, /^User-agent: \*\nAllow: \//)
	for (const path of ["/api/", "/dashboard/", "/guest/"]) assert.match(body, new RegExp(`Disallow: ${path}`))
	assert.match(body, /Sitemap: https:\/\/shellbytheshore\.com\/sitemap\.xml/)
	assert.equal(response.headers.get("x-robots-tag"), null)
})

test("robots has one dynamic route source and no public duplicate", () => {
	assert.equal(existsSync("app/robots.ts"), false)
	assert.equal(existsSync("app/robots.txt/route.ts"), true)
	assert.equal(existsSync("public/robots.txt"), false)
	assert.match(read("app/robots.txt/route.ts"), /force-dynamic/)
})
