import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { test } from "node:test"
import { ownerAccess, safeOwnerRedirect } from "../lib/owner-auth"

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
	assert.match(telegram, /https:\/\/shellbytheshore\.com/)
	assert.match(telegram, /process\.env\.SITE_URL/)
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
