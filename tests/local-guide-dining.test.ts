import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { placeIsCoffeeFocused, placeMatchesGuideDiningCategory, placeSupportsBreakfast } from "../lib/local-place-categories"
import { EL_PORTO_AREA_ORIGIN, getLocalGuideCandidates, LOCAL_GUIDE_CANDIDATE_LIMIT, LOCAL_GUIDE_MAX_DISTANCE_KM } from "../lib/local-guide-places"
import { allLocalPlaces, haversineKm } from "../lib/local-places"
import { rankLocalGuideDiningPlaces } from "../lib/local-guide-ranking"

const candidates = getLocalGuideCandidates()
const interactiveMap = readFileSync("app/_components/LocalGuideMapInteractive.tsx", "utf8")
const guidePage = readFileSync("app/guide/page.tsx", "utf8")

test("Food includes real El Porto candidates and useful Manhattan Beach coverage", () => {
	const nearby = candidates.Food.filter((place) => place.distanceKm <= 1.5)
	assert.ok(nearby.length >= 8, JSON.stringify(nearby))
	assert.ok(candidates.Food.some((place) => /Manhattan Beach/.test(place.area)))
	assert.ok(nearby.every((place) => place.category === "Food"))
	assert.ok(candidates.Food.every((place) => place.distanceKm <= LOCAL_GUIDE_MAX_DISTANCE_KM))
})

test("Coffee requires stored coffee evidence and prioritizes El Porto coverage", () => {
	const nearby = candidates.Coffee.filter((place) => place.distanceKm <= 1.5)
	assert.ok(nearby.length >= 3, JSON.stringify(nearby))
	const byId = new Map(allLocalPlaces().map((place) => [place.id, place]))
	assert.ok(candidates.Coffee.every((place) => placeIsCoffeeFocused(byId.get(place.id)!)))
	assert.equal(placeIsCoffeeFocused({ name: "Generic Cafe", category: "cafe", tags: { amenity: "cafe" } }), false)
	assert.equal(placeIsCoffeeFocused({ name: "Ordinary Restaurant", category: "restaurant", cuisine: "coffee", tags: {} }), false)
	assert.equal(placeIsCoffeeFocused({ name: "Bakery with stored coffee evidence", category: "bakery", cuisine: "coffee_shop", tags: {} }), true)
	assert.equal(placeIsCoffeeFocused({ name: "Ordinary Bakery", category: "bakery", tags: {} }), false)
})

test("Breakfast is derived only from explicit stored breakfast or brunch evidence", () => {
	const nearby = candidates.Breakfast.filter((place) => place.distanceKm <= 1.5)
	assert.ok(nearby.length >= 2, JSON.stringify(nearby))
	const byId = new Map(allLocalPlaces().map((place) => [place.id, place]))
	assert.ok(candidates.Breakfast.every((place) => placeSupportsBreakfast(byId.get(place.id)!)))
	assert.equal(placeSupportsBreakfast({ category: "cafe", tags: { amenity: "cafe" } }), false)
	assert.equal(placeSupportsBreakfast({ category: "cafe", cuisine: "breakfast;coffee_shop", tags: {} }), true)
	assert.equal(placeMatchesGuideDiningCategory({ category: "restaurant", cuisine: "brunch", tags: {} }, "Breakfast"), true)
})

test("local candidate payload is bounded, valid, unique and contains no raw OSM metadata", () => {
	assert.equal(allLocalPlaces().length, 12_664)
	for (const places of Object.values(candidates)) {
		assert.ok(places.length <= LOCAL_GUIDE_CANDIDATE_LIMIT)
		assert.equal(new Set(places.map((place) => place.id)).size, places.length)
		for (const place of places) {
			assert.ok(Number.isFinite(place.lat) && Math.abs(place.lat) <= 90)
			assert.ok(Number.isFinite(place.lng) && Math.abs(place.lng) <= 180)
			assert.ok(Math.abs(place.distanceKm - haversineKm(EL_PORTO_AREA_ORIGIN, { latitude: place.lat, longitude: place.lng })) < 1e-9)
			assert.doesNotMatch(JSON.stringify(place), /source_id|last_imported_at|opening_hours|operator|"tags"/)
		}
	}
})

test("combined ranking respects nearby curation, proximity tiers, downtown balance and deduplication", () => {
	const curated = [
		{ name: "Nearby Host Pick", category: "Food", area: "Manhattan Beach", description: "Stored editorial recommendation.", lat: 33.9032, lng: -118.4201, tag: "ShellByTheShore Pick" },
		{ name: "Downtown Host Pick", category: "Food", area: "Manhattan Beach", description: "Stored editorial recommendation.", lat: 33.8844, lng: -118.4114, tag: "ShellByTheShore Pick" }
	]
	const ranked = rankLocalGuideDiningPlaces("Food", candidates, curated, 16)
	assert.equal(ranked.length, 16)
	assert.equal(ranked[0]?.name, "Nearby Host Pick")
	assert.ok(ranked.slice(1, 11).every((place) => !place.curated && place.distanceKm <= 1.5), JSON.stringify(ranked))
	assert.ok(ranked.some((place) => place.name === "Downtown Host Pick"))
	assert.ok(ranked.every((place) => place.distanceKm <= LOCAL_GUIDE_MAX_DISTANCE_KM))
	assert.equal(new Set(ranked.map((place) => place.name.toLowerCase())).size, ranked.length)
})

test("map implementation keeps El Porto viewport, bounded fit and card-marker synchronization", () => {
	assert.match(guidePage, /getLocalGuideCandidates\(\)/)
	assert.match(guidePage, /<LocalGuideMapInteractive candidates=\{candidates\}\/>/)
	assert.match(interactiveMap, /center: \[EL_PORTO_ORIGIN\.lng, EL_PORTO_ORIGIN\.lat\]/)
	assert.match(interactiveMap, /fitBounds\(bounds, \{ padding: 56, maxZoom: 14/)
	assert.match(interactiveMap, /marker\.getElement\(\)\.dataset\.poiId = poi\.id/)
	assert.match(interactiveMap, /data-poi-id=\{poi\.id\}/)
	assert.match(interactiveMap, /setSelectedPoiId\(poi\.id\)/)
	assert.match(interactiveMap, /markers\.current\.get\(poi\.id\)\?\.togglePopup\(\)/)
	assert.doesNotMatch(interactiveMap, /private address|unit number|door code/i)
	for (const attribution of ["OpenStreetMap", "OpenMapTiles", "OpenFreeMap"]) assert.match(interactiveMap, new RegExp(attribution))
})

