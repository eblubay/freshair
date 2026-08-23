import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { validTelegramWebhookSecret } from "../lib/telegram-env"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("valid Telegram webhook secret is accepted without exposing its value", () => {
	const environment = { TELEGRAM_HOST_WEBHOOK_SECRET: "test-only-secret" }
	assert.equal(validTelegramWebhookSecret("test-only-secret", environment), true)
	assert.equal(JSON.stringify(validTelegramWebhookSecret("test-only-secret", environment)), "true")
})

test("missing and incorrect Telegram webhook secrets are rejected", () => {
	const environment = { TELEGRAM_HOST_WEBHOOK_SECRET: "test-only-secret" }
	assert.equal(validTelegramWebhookSecret(null, environment), false)
	assert.equal(validTelegramWebhookSecret("wrong-secret", environment), false)
	assert.equal(validTelegramWebhookSecret("test-only-secret", {}), false)
})

test("Telegram callback bypasses Clerk only and retains secret-header authorization", () => {
	const middleware = read("middleware.ts")
	const route = read("app/api/telegram/host/callback/route.ts")
	const exclusion = middleware.indexOf('request.nextUrl.pathname === "/api/telegram/host/callback"')
	const clerkDispatch = middleware.indexOf("return privateMiddleware(request, event)")
	assert.ok(exclusion >= 0 && exclusion < clerkDispatch)
	assert.match(route, /x-telegram-bot-api-secret-token/)
	assert.match(route, /validTelegramWebhookSecret/)
	assert.doesNotMatch(route, /auth\(|clerk|currentUser/i)
})

test("validly signed unauthorized-chat updates are acknowledged without operational access", () => {
	const route = read("app/api/telegram/host/callback/route.ts")
	assert.match(route, /unauthorizedChat \? 200 : 400/)
	assert.match(read("lib/telegram-host-update.ts"), /if \(!authorizedHost\(chatId\)\)/)
	assert.doesNotMatch(route, /console\.|secret.*json|json.*secret/i)
})

test("Telegram management endpoints remain Clerk and owner-allowlist protected", () => {
	const middleware = read("middleware.ts")
	assert.match(middleware, /startsWith\("\/api\/internal\/telegram\/"\)/)
	for (const path of ["app/api/internal/telegram/setup-webhook/route.ts", "app/api/internal/telegram/webhook-status/route.ts"]) {
		const route = read(path)
		assert.match(route, /await auth\(\)/)
		assert.match(route, /ownerAccess\(userId\)/)
	}
})
