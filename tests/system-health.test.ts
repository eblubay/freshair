import assert from "node:assert/strict"
import test from "node:test"
import { calendarHealth, cleaningHealth, cleanerNotificationHealth, disabledPayment, optionalProvider, ownerHealthAccess, smtpHealth, telegramHealth } from "../lib/system-health"

test("successful outbound email evidence makes SMTP ready", () => {
	assert.equal(smtpHealth(true, 1).status, "READY")
	assert.equal(smtpHealth(true, 0).status, "DEGRADED")
})

test("recent calendar evidence is ready and stale evidence is degraded", () => {
	const now = new Date("2026-08-23T05:00:00Z")
	assert.equal(calendarHealth({ configured: true, lastSuccessfulSync: new Date("2026-08-23T03:30:00Z"), lastSyncSucceeded: true, now }).status, "READY")
	assert.equal(calendarHealth({ configured: true, lastSuccessfulSync: new Date("2026-08-23T01:59:59Z"), lastSyncSucceeded: true, now }).status, "DEGRADED")
	assert.equal(calendarHealth({ configured: true, lastSuccessfulSync: new Date("2026-08-23T04:30:00Z"), lastSyncSucceeded: false, now }).status, "DEGRADED")
})

test("Telegram requires complete configuration and a connected webhook", () => {
	assert.equal(telegramHealth({ token: true, chatId: true, webhookSecret: true, webhookConnected: true }).status, "READY")
	assert.equal(telegramHealth({ token: false, chatId: true, webhookSecret: true }).status, "NOT_CONFIGURED")
	assert.equal(telegramHealth({ token: true, chatId: true, webhookSecret: true, webhookConnected: false }).status, "DEGRADED")
})

test("intentional and optional launch states remain neutral", () => {
	assert.equal(disabledPayment("Stripe").status, "DISABLED_BY_DESIGN")
	assert.equal(optionalProvider("Provider not configured").status, "OPTIONAL")
})

test("missing cleaner setup is not falsely degraded", () => {
	assert.equal(cleaningHealth({ databaseReady: true, enabled: true, cleanerAssigned: false }).status, "NOT_CONFIGURED")
	assert.equal(cleanerNotificationHealth({ channelConfigured: false, verifiedDeliveries: 0 }).status, "NOT_CONFIGURED")
})

test("health authorization requires the exact configured owner", () => {
	assert.equal(ownerHealthAccess(null, "owner_1").status, 401)
	assert.equal(ownerHealthAccess("other", "owner_1").status, 403)
	assert.equal(ownerHealthAccess("owner_1", undefined).status, 403)
	assert.equal(ownerHealthAccess("owner_1", "owner_1").allowed, true)
})

test("weather fallback, n8n, payments and missing AI use non-failure semantics in the route", async () => {
	const { readFile } = await import("node:fs/promises")
	const source = await readFile("app/api/health/route.ts", "utf8")
	assert.match(source, /weather: optionalProvider/)
	assert.match(source, /n8n: \{ status: "NOT_REQUIRED"/)
	assert.match(source, /braintree: disabledPayment/)
	assert.match(source, /aiDraft: aiProviderConfigured[\s\S]*optionalProvider/)
})
