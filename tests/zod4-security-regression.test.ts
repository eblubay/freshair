import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import test from "node:test"
import { z } from "zod"

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)

test("the production Zod dependency remains on the patched Zod 4 line", () => {
	const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies?: Record<string, string> }
	assert.equal(manifest.dependencies?.zod, "4.6.7")
	assert.doesNotMatch(readFileSync("package-lock.json", "utf8"), /"node_modules\/zod"\s*:\s*\{\s*"version"\s*:\s*"(?:0|1|2|3)\./)
})

test("booking hold quoteInput preserves Zod 3 absent and explicit-value behavior", () => {
	const schema = z.object({ quoteInput: z.unknown().optional() })
	const absent = schema.parse({})
	assert.equal(hasOwn(absent, "quoteInput"), false)

	const explicitUndefined = schema.parse({ quoteInput: undefined })
	assert.equal(hasOwn(explicitUndefined, "quoteInput"), true)
	assert.equal(explicitUndefined.quoteInput, undefined)
	assert.deepEqual(schema.parse({ quoteInput: null }), { quoteInput: null })
	assert.deepEqual(schema.parse({ quoteInput: { propertyId: "property" } }), { quoteInput: { propertyId: "property" } })

	const route = readFileSync("app/api/bookings/hold/route.ts", "utf8")
	assert.match(route, /quoteInput:\s*z\.unknown\(\)\.optional\(\)/)
})

test("existing defaults preserve their Zod 3 output keys and values", () => {
	const schemas = [
		[z.object({ website: z.string().optional().default("") }), { website: "" }],
		[z.object({ channel: z.enum(["TELEGRAM", "EMAIL", "ADMIN"]).default("ADMIN") }), { channel: "ADMIN" }],
		[z.object({ enabled: z.boolean().default(true) }), { enabled: true }],
		[z.object({ subject: z.string().default(""), isBounce: z.boolean().optional().default(false), isSpam: z.boolean().optional().default(false) }), { subject: "", isBounce: false, isSpam: false }]
	] as const
	for (const [schema, expected] of schemas) {
		assert.deepEqual(schema.parse({}), expected)
		assert.deepEqual(schema.parse(Object.fromEntries(Object.keys(expected).map((key) => [key, undefined]))), expected)
	}
})

test("passthrough, ZodError identity, issue paths, and UI-facing handling remain compatible", () => {
	const schema = z.object({ known: z.string() }).passthrough()
	assert.deepEqual(schema.parse({ known: "ok", extra: { nested: true } }), { known: "ok", extra: { nested: true } })

	const result = z.object({ url: z.string().url() }).safeParse({ url: "invalid" })
	assert.equal(result.success, false)
	if (result.success) assert.fail("invalid URL unexpectedly passed validation")
	assert.ok(result.error instanceof z.ZodError)
	assert.deepEqual(result.error.issues[0]?.path, ["url"])
	assert.ok(result.error.issues[0]?.message)

	const component = readFileSync("app/dashboard/_components/add-property-form.tsx", "utf8")
	assert.match(component, /instanceof z\.ZodError/)
})

test("the application still defines no Zod collection schemas", () => {
	const walk = (path: string): string[] => {
		return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
			const child = `${path}/${entry.name}`
			if (entry.isDirectory()) return walk(child)
			return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [child] : []
		})
	}
	const files = ["app", "components", "lib"].flatMap(walk)
	for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /\bz\.(?:array|set|map)\s*\(/, file)
})
