import assert from "node:assert/strict"
import test from "node:test"
import { answerConciergeDeterministically } from "../lib/concierge"
import { detectLanguage } from "../lib/concierge-language"
import { detectPrimaryIntent } from "../lib/concierge-retrieval"
import { extractPlaceIntent } from "../lib/local-place-search"

const italianCases = [
	["Fammi un programma per Malibu per una coppia.", "malibu"],
	["Organizzami una giornata a Malibu.", "malibu"],
	["Cosa possiamo fare a Malibu io e mia moglie?", "malibu"],
	["Fammi un itinerario di un giorno a Malibu.", "malibu"],
	["Cosa fare a Malibu in coppia?", "malibu"],
	["Programma una giornata a Venice e Santa Monica.", "santa monica"],
	["Cosa possiamo fare a Redondo Beach con bambini?", "redondo beach"],
	["Organizzami un pomeriggio a Hermosa Beach.", "hermosa beach"]
] as const

const englishCases = [
	["Plan a Malibu day for a couple.", "malibu"],
	["Build a one-day Malibu itinerary.", "malibu"],
	["What should a couple do in Malibu?", "malibu"],
	["Plan a Venice and Santa Monica day.", "santa monica"],
	["What can we do in Redondo Beach with kids?", "redondo beach"]
] as const

for (const [question, area] of italianCases) test(`Italian itinerary routing: ${question}`, () => {
	assert.equal(detectLanguage(question), "it")
	assert.equal(detectPrimaryIntent(question).intent, "itinerary")
	assert.equal(extractPlaceIntent(question).area, area)
	const answer = answerConciergeDeterministically(question)
	assert.equal(answer.metadata.language, "it")
	assert.equal(answer.metadata.answerType, "itinerary")
	assert.equal(answer.metadata.primaryIntent, "itinerary")
	assert.ok(answer.metadata.qaIds.length > 0)
	assert.doesNotMatch(answer.metadata.qaIds.join(" "), /laundry|kitchen|wifi|internet/i)
	assert.doesNotMatch(answer.answer, /Here’s|Verified guidance|Yes\. The listing|washer|dryer/i)
})

for (const [question, area] of englishCases) test(`English itinerary routing: ${question}`, () => {
	assert.equal(detectLanguage(question), "en")
	assert.equal(detectPrimaryIntent(question).intent, "itinerary")
	assert.equal(extractPlaceIntent(question).area, area)
	const answer = answerConciergeDeterministically(question)
	assert.equal(answer.metadata.language, "en")
	assert.equal(answer.metadata.answerType, "itinerary")
	assert.equal(answer.metadata.primaryIntent, "itinerary")
	assert.doesNotMatch(answer.metadata.qaIds.join(" "), /laundry|kitchen|wifi|internet/i)
})

const propertyRegressions = [
	["Can we do laundry?", "v2-laundry"],
	["Possiamo fare il bucato?", "v2-laundry"],
	["What is available in the kitchen?", "v2-kitchen"],
	["Cosa c'è in cucina?", "v2-kitchen"],
	["Do you have Wi-Fi?", "v2-wifi"],
	["C'è il Wi-Fi?", "v2-wifi"],
	["How many guests can stay?", "v2-capacity"]
] as const

for (const [question, expectedQa] of propertyRegressions) test(`Property domain remains eligible: ${question}`, () => {
	const answer = answerConciergeDeterministically(question)
	assert.ok(answer.metadata.qaIds.includes(expectedQa), `${question}: ${answer.metadata.qaIds.join(",")}`)
	assert.notEqual(answer.metadata.answerType, "itinerary")
})

test("exact Italian Malibu request returns the area itinerary canonical", () => {
	const answer = answerConciergeDeterministically("Fammi un programma per Malibu per una coppia.")
	assert.deepEqual(answer.metadata.qaIds, ["v2-malibu-day"])
	assert.match(answer.answer, /\*\*Programma consigliato — Zona: malibu · coppia\*\*/)
	assert.match(answer.answer, /1\. \*\*Tappa 1\*\*\nMalibu Surfrider Beach/)
	assert.match(answer.answer, /2\. \*\*Tappa 2\*\*\nMalibu Pier/)
	assert.match(answer.answer, /\*\*Note pratiche\*\*[\s\S]*Traffico e parcheggio/)
	assert.ok(answer.answer.includes("Malibu Surfrider Beach"))
	assert.ok(answer.answer.includes("Malibu Pier"))
})

test("Italian Venice and Santa Monica itinerary renders a grounded ordered program", () => {
	const answer = answerConciergeDeterministically("Programma una giornata a Venice e Santa Monica.")
	assert.deepEqual(answer.metadata.qaIds, ["v2-venice-santa-monica"])
	assert.match(answer.answer, /\*\*Programma consigliato — Venice \+ Santa Monica · una giornata\*\*/)
	assert.match(answer.answer, /1\. \*\*Tappa 1\*\*[\s\S]*Boardwalk[\s\S]*Venice Canals/)
	assert.match(answer.answer, /2\. \*\*Tappa 2\*\*[\s\S]*Santa Monica[\s\S]*Third Street Promenade/)
})

test("English itinerary uses the localized structured renderer", () => {
	const answer = answerConciergeDeterministically("Plan a Malibu day for a couple.")
	assert.match(answer.answer, /\*\*Suggested itinerary — Area: malibu · couple · one day\*\*/)
	assert.match(answer.answer, /1\. \*\*Step 1\*\*/)
	assert.doesNotMatch(answer.answer, /Programma consigliato|Tappa/)
})
