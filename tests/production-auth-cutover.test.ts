import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { test } from "node:test"
import { ownerAccess, safeOwnerRedirect } from "../lib/owner-auth"
import { resolveHostTelegramEnvironment } from "../lib/telegram-env"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const sourceFiles = (directory: string): string[] => readdirSync(new URL(`../${directory}`, import.meta.url)).flatMap((name) => {
	const path = `${directory}/${name}`
	return statSync(new URL(`../${path}`, import.meta.url)).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx|js|mjs|cjs|json)$/.test(name) ? [path] : []
})

test("owner auth redirects signed-out settings requests to a stable callback without a loop", () => {
	const settings = read("app/dashboard/settings/page.tsx")
	assert.match(settings, /redirect\("\/dashboard\?redirect_url=\/dashboard\/settings"\)/)
	assert.match(read("app/dashboard/page.tsx"), /fallbackRedirectUrl=\{redirectUrl\}/)
	assert.equal(safeOwnerRedirect("/dashboard/settings"), "/dashboard/settings")
	assert.equal(safeOwnerRedirect("https://attacker.example"), "/dashboard/settings")
})

test("owner allowlist permits only the configured authenticated owner", () => {
	assert.deepEqual(ownerAccess(null, "user_owner"), { allowed: false, status: 401 })
	assert.deepEqual(ownerAccess("user_owner", "user_owner"), { allowed: true, status: 200 })
	assert.deepEqual(ownerAccess("user_other", "user_owner"), { allowed: false, status: 403 })
	assert.deepEqual(ownerAccess("user_owner", ""), { allowed: false, status: 403 })
})

test("public pages stay outside Clerk while dashboard auth stays private", () => {
	const middleware = read("middleware.ts")
	assert.match(middleware, /request\.nextUrl\.pathname\.startsWith\("\/dashboard"\)/)
	assert.match(middleware, /if \(privatePath\) return privateMiddleware/)
	assert.doesNotMatch(read("app/layout.tsx"), /ClerkProvider/)
	assert.match(read("app/dashboard/layout.tsx"), /ClerkProvider/)
})

test("production callbacks are canonical and obsolete staging host is not in runtime code", () => {
	const telegram = read("lib/telegram-host-api.ts")
	const environment = read("lib/telegram-env.ts")
	assert.match(telegram, /https:\/\/shellbytheshore\.com/)
	assert.match(environment, /"SITE_URL"/)
	for (const path of [...sourceFiles("app"), ...sourceFiles("lib"), "middleware.ts"])
		assert.doesNotMatch(read(path), /dodgerblue-caribou-367252\.hostingersite\.com/, path)
})

test("calendar automation remains header-secret protected and read-only", () => {
	const route = read("app/api/internal/automation/calendar-sync/route.ts")
	assert.match(route, /headers\.get\("x-automation-secret"\) !== secret/)
	assert.match(route, /status: 401/)
	assert.doesNotMatch(route, /AIRBNB_API|APIFY|playwright|writeback/i)
})

test("auth diagnostics and tests never embed keys or owner ids", () => {
	for (const path of ["lib/owner-auth.ts", "middleware.ts", "tests/production-auth-cutover.test.ts"]) {
		const source = read(path)
		assert.doesNotMatch(source, /(?:pk|sk)_(?:live|test)_[A-Za-z0-9]+/)
	}
})

test("historical Telegram environment names resolve without overriding canonical configuration", () => {
	assert.deepEqual(resolveHostTelegramEnvironment({ TELEGRAM_BOT_TOKEN: "legacy-token", TELEGRAM_CHAT_ID: "legacy-chat", TELEGRAM_CALLBACK_SECRET: "legacy-secret", NEXT_PUBLIC_SITE_URL: "https://shellbytheshore.com" }),
		{ token: "legacy-token", chatId: "legacy-chat", webhookSecret: "legacy-secret", siteUrl: "https://shellbytheshore.com" })
	assert.deepEqual(resolveHostTelegramEnvironment({ TELEGRAM_HOST_BOT_TOKEN: "canonical-token", TELEGRAM_BOT_TOKEN: "legacy-token", TELEGRAM_HOST_CHAT_ID: "canonical-chat", TELEGRAM_CHAT_ID: "legacy-chat", TELEGRAM_HOST_WEBHOOK_SECRET: "canonical-secret", TELEGRAM_CALLBACK_SECRET: "legacy-secret", SITE_URL: "https://shellbytheshore.com", NEXT_PUBLIC_SITE_URL: "https://legacy.invalid" }),
		{ token: "canonical-token", chatId: "canonical-chat", webhookSecret: "canonical-secret", siteUrl: "https://shellbytheshore.com" })
})

test("Telegram owner endpoints authorize by the owner allowlist instead of stale property ownership", () => {
	for (const path of ["app/api/internal/telegram/setup-webhook/route.ts", "app/api/internal/telegram/webhook-status/route.ts"]) {
		const source = read(path)
		assert.match(source, /ownerAccess\(userId\)/)
		assert.doesNotMatch(source, /SELECT id FROM properties WHERE clerk_id/)
	}
})
