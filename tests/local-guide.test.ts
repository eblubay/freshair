import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const guide = readFileSync("app/_components/LocalGuideMap.tsx", "utf8")
const interactiveGuide = readFileSync("app/_components/LocalGuideMapInteractive.tsx", "utf8")

test("Local Guide preserves legacy destinations and adds requested South Bay cities", () => {
	for (const place of ["Venice Beach Boardwalk", "Santa Monica Pier", "Malibu Pier", "Manhattan Beach", "Hermosa Beach", "Redondo Beach"]) {
		assert.match(guide, new RegExp(`name: "${place}"`))
	}
})

test("Local Guide exposes grouped, mobile-friendly cards and internal map actions", () => {
	assert.match(interactiveGuide, /groups\[`\$\{poi\.area\} · \$\{poi\.category\}`\]/)
	assert.match(interactiveGuide, /overflow-x-auto/)
	assert.match(interactiveGuide, /min-h-10/)
	assert.match(interactiveGuide, /Show on map/)
	assert.doesNotMatch(interactiveGuide, /google\.com\/maps/)
	assert.match(interactiveGuide, /No partnership or sponsorship is implied unless specifically stated\./)
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
