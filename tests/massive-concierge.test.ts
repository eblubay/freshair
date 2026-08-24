import assert from "node:assert/strict"
import test from "node:test"
import massive from "../knowledge/massive-local-qa.json"
import localPlaces from "../knowledge/local-places.json"
import { answerConciergeDeterministically } from "../lib/concierge"
import { extractPlaceIntent, searchPlaces } from "../lib/local-place-search"
import { haversineKm } from "../lib/local-places"

test("massive internal library meets canonical, localization and variant targets", () => {
	assert.equal(massive.qas.length, 5000)
	assert.equal(massive.localizedCount, 25000)
	assert.equal(massive.variantCount, 100000)
	assert.ok(massive.qas.every((qa) => ["en", "it", "es", "fr", "de"].every((language) => qa.localizations[language as keyof typeof qa.localizations]?.answer)))
})

test("local place store is normalized, unique and geographically valid", () => {
	assert.ok(localPlaces.places.length >= 10000)
	assert.equal(new Set(localPlaces.places.map((place) => place.id)).size, localPlaces.places.length)
	assert.ok(localPlaces.places.every((place) => place.source === "openstreetmap" && place.source_id && place.name && place.category && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180))
	assert.equal(localPlaces.attribution, "© OpenStreetMap contributors")
})

test("Haversine gives a geodesic straight-line result", () => {
	const km = haversineKm({ latitude: 33.8844, longitude: -118.4114 }, { latitude: 34.0099, longitude: -118.4962 })
	assert.ok(km > 14 && km < 18, String(km))
})

const intentCases = [
	["breakfast near the beach", "restaurant", "beach"], ["pharmacy near Manhattan Beach", "pharmacy", "manhattan beach"],
	["restaurant near Hermosa Pier", "restaurant", "hermosa beach"], ["breakfast in El Segundo", "restaurant", "el segundo"],
	["Dove trovo una farmacia a Manhattan Beach?", "pharmacy", "manhattan beach"], ["¿Dónde puedo aparcar en Santa Monica?", "parking", "santa monica"],
	["Un café en Venice", "cafe", "venice"], ["Eine Apotheke in Redondo Beach", "pharmacy", "redondo beach"]
] as const
for (const [question, category, area] of intentCases) test(`extracts geographic qualifiers: ${question}`, () => {
	const intent = extractPlaceIntent(question); assert.ok(intent.categories.includes(category), JSON.stringify(intent)); if (area === "beach") assert.equal(intent.proximity, "beach"); else assert.equal(intent.area, area)
})

test("curated POIs rank before generic matches when relevant", () => {
	const result = searchPlaces("breakfast near Manhattan Beach", "en", 5)
	assert.ok(result.results.length >= 2)
	assert.equal(result.results[0].place.curated, true)
})

const languageCases = [
	["Where can we get coffee near Manhattan Beach?", "en"], ["Dove possiamo trovare una farmacia a Manhattan Beach?", "it"],
	["¿Dónde podemos aparcar cerca de Venice?", "es"], ["Où pouvons-nous prendre un café à Santa Monica ?", "fr"],
	["Wo ist eine Apotheke in Redondo Beach?", "de"]
] as const
for (const [question, language] of languageCases) test(`place answer is map-aware and language-locked: ${language}`, () => {
	const result = answerConciergeDeterministically(question)
	assert.equal(result.metadata.language, language)
	assert.ok(result.map?.active); assert.ok(result.map!.destinations.length >= 1); assert.ok(result.map!.destinations.every((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)))
	assert.doesNotMatch(result.answer, /source_id|subcategory|opening_hours|PUBLIC_SAFE/)
})

test("directions and show-on-map requests activate accurate destination mapping", () => {
	for (const question of ["Show me Manhattan Beach Pier on the map", "Mostrami Manhattan Beach Pier sulla mappa", "¿Cómo llego a Santa Monica Pier?", "Où est Venice Beach Boardwalk ?", "Wie komme ich zum Malibu Pier?"]) {
		const result = answerConciergeDeterministically(question); assert.ok(result.map?.active, question); assert.ok(result.map!.selectedDestinationId); assert.ok(result.map!.destinations.length >= 1); assert.doesNotMatch(result.answer, /walking time|drive time|turn left|turn right/i)
	}
})

test("multiple recommendations create multiple pins without private address leakage", () => {
	const result = answerConciergeDeterministically("Where can we get coffee near Manhattan Beach?")
	assert.ok((result.map?.destinations.length || 0) > 1)
	assert.equal(result.map?.showGeneralOrigin, true)
	assert.doesNotMatch(JSON.stringify(result.map), /door|unit|access code|password/i)
})
