import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const guide = readFileSync("app/_components/LocalGuideMap.tsx", "utf8")

test("Local Guide preserves legacy destinations and adds requested South Bay cities", () => {
	for (const place of ["Venice Beach Boardwalk", "Santa Monica Pier", "Malibu Pier", "Manhattan Beach", "Hermosa Beach", "Redondo Beach"]) {
		assert.match(guide, new RegExp(`name: "${place}"`))
	}
})

test("Local Guide exposes grouped, mobile-friendly cards and coordinate directions", () => {
	assert.match(guide, /groups\[`\$\{poi\.area\} · \$\{poi\.category\}`\]/)
	assert.match(guide, /overflow-x-auto/)
	assert.match(guide, /min-h-10/)
	assert.match(guide, /google\.com\/maps\/dir\/\?api=1/)
	assert.match(guide, /No partnership or sponsorship is implied unless specifically stated\./)
})

test("Local Guide data is free of duplicate names and invalid coordinate ranges", () => {
	const pois = [...guide.matchAll(/\{ name: "([^"]+)", category: "([^"]+)", area: "([^"]+)".*?lat: (-?\d+(?:\.\d+)?), lng: (-?\d+(?:\.\d+)?)/g)]
	assert.equal(pois.length, 62)
	assert.equal(new Set(pois.map(([, name]) => name.toLowerCase())).size, pois.length)
	for (const [, , , , lat, lng] of pois) {
		assert.ok(Math.abs(Number(lat)) <= 90)
		assert.ok(Math.abs(Number(lng)) <= 180)
	}
})
