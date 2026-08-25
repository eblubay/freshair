import assert from "node:assert/strict"
import test from "node:test"
import { answerConciergeDeterministically } from "../lib/concierge"
import { extractPlaceIntent, placeMatchesRequestedCategories, searchPlaces } from "../lib/local-place-search"

const languages = {
	en: { pharmacy: "pharmacy near me", supermarket: "supermarket nearby", cafe: "closest coffee", parking: "parking near me", hospital: "hospital nearby", atm: "closest ATM", bakery: "bakery near me", restaurant: "restaurant nearby" },
	it: { pharmacy: "una farmacia vicino a me", supermarket: "supermercato qui vicino", cafe: "caffè più vicino", parking: "parcheggio vicino a me", hospital: "ospedale più vicino", atm: "bancomat qui vicino", bakery: "panetteria più vicina", restaurant: "ristorante vicino a me" },
	es: { pharmacy: "farmacia cerca de mí", supermarket: "supermercado cerca", cafe: "café más cercano", parking: "aparcamiento cerca de mí", hospital: "hospital más cercano", atm: "cajero cerca", bakery: "panadería más cercana", restaurant: "restaurante cerca de mí" },
	fr: { pharmacy: "pharmacie près de moi", supermarket: "supermarché à proximité", cafe: "café le plus proche", parking: "stationnement près de moi", hospital: "hôpital le plus proche", atm: "distributeur à proximité", bakery: "boulangerie la plus proche", restaurant: "restaurant près de moi" },
	de: { pharmacy: "Apotheke in meiner Nähe", supermarket: "Supermarkt in der Nähe", cafe: "nächstes Kaffee", parking: "Parkplatz in meiner Nähe", hospital: "Krankenhaus in der Nähe", atm: "nächster Geldautomat", bakery: "nächste Bäckerei", restaurant: "Restaurant in meiner Nähe" }
} as const

const expectedCategory = { pharmacy: "pharmacy", supermarket: "supermarket", cafe: "cafe", parking: "parking", hospital: "hospital", atm: "atm", bakery: "bakery", restaurant: "restaurant" } as const

for (const [language, queries] of Object.entries(languages)) {
	for (const [kind, question] of Object.entries(queries)) {
		test(`${language}: explicit ${kind} near-me uses only matching real places`, () => {
			const category = expectedCategory[kind as keyof typeof expectedCategory]
			const intent = extractPlaceIntent(question)
			assert.equal(intent.proximity, "nearby", JSON.stringify(intent))
			assert.equal(intent.explicitCategory, true)
			assert.ok(intent.categories.includes(category), JSON.stringify(intent))

			const search = searchPlaces(question, language as keyof typeof languages, 5)
			assert.ok(search.results.length >= 3, question)
			assert.ok(search.results.every(({ place }) => placeMatchesRequestedCategories(place, intent.categories)), JSON.stringify(search.results.map(({ place }) => ({ name: place.name, category: place.category }))))
			assert.ok(search.results.every(({ place }) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180))

			const answer = answerConciergeDeterministically(question)
			assert.equal(answer.metadata.language, language)
			assert.equal(answer.metadata.answerType, "place-search")
			assert.equal(answer.metadata.primaryIntent, category)
			assert.ok(answer.map?.active)
			assert.ok(answer.map!.destinations.length >= 3 && answer.map!.destinations.length <= 5)
			assert.ok(answer.map!.destinations.every((destination) => placeMatchesRequestedCategories(destination, intent.categories)))
			assert.doesNotMatch(`${answer.answer}\n${JSON.stringify(answer.map)}`, /door code|access code|password|private address|unit number/i)
		})
	}
}

test("local_places supplies primary near-me results when no same-category curated POI exists", () => {
	for (const question of ["pharmacy near me", "hospital near me", "ATM near me", "bakery near me", "parking near me"]) {
		const search = searchPlaces(question, "en", 5)
		assert.ok(search.results.some(({ place }) => place.source === "openstreetmap"), question)
	}
})

test("same-category curated POIs receive priority and each tier remains proximity sorted", () => {
	const search = searchPlaces("restaurant near me", "en", 5)
	assert.equal(search.results[0]?.place.curated, true)
	assert.ok(search.results.every(({ place }) => place.category === "restaurant" || ["fast_food", "food_court"].includes(place.category)))
	assert.doesNotMatch(search.results.map(({ place }) => place.name).join(" | "), /Farmers Market/i)
	for (let index = 1; index < search.results.length; index++) {
		const previous = search.results[index - 1]
		const current = search.results[index]
		if (previous.place.curated === current.place.curated) assert.ok(previous.distanceKm! <= current.distanceKm!, `${previous.place.name} should precede ${current.place.name}`)
	}
})

test("Redondo discovery is geographically and semantically constrained", () => {
	const question = "cosa fare a Redondo Beach"
	const search = searchPlaces(question, "it", 5)
	assert.equal(search.intent.area, "redondo beach")
	assert.deepEqual(search.intent.categories, ["attraction"])
	assert.ok(search.results.length >= 3)
	assert.ok(search.results.every(({ place }) => placeMatchesRequestedCategories(place, search.intent.categories)))
	assert.ok(search.results.slice(0, 5).every(({ place }) => /redondo/i.test(place.city || place.name)), JSON.stringify(search.results.map(({ place }) => ({ name: place.name, city: place.city, category: place.category }))))
	const answer = answerConciergeDeterministically(question)
	assert.equal(answer.metadata.language, "it")
	assert.equal(answer.metadata.answerType, "place-search")
	assert.ok(answer.map?.destinations.every((place) => placeMatchesRequestedCategories(place, ["attraction"])))
	assert.doesNotMatch(answer.answer, /Good Stuff|Hi-Fi Espresso|Trader Joe/i)
})
