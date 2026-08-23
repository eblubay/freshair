import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

type Scope = "PUBLIC_SAFE" | "GUEST_ONLY" | "OWNER_ONLY"
type RecordShape = { id: string; category: string; title: string; content: string; tags: string[]; location: string; scope: Scope; confidence: number; freshness: string; source: string; sourcePath: string; poi?: { id: string; lat: number; lng: number; href: string } }
const root = process.cwd()
const readJson = async <T>(file: string) => JSON.parse(await readFile(path.join(root, file), "utf8")) as T
const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
const href = (id: string) => `/guide#poi-${id}`

function validate(records: RecordShape[]) {
	const ids = new Set<string>()
	for (const item of records) {
		if (!item.id || !item.category || !item.title || !item.content || !Array.isArray(item.tags) || !item.sourcePath) throw new Error(`Malformed concierge record: ${item.id || "unknown"}`)
		if (ids.has(item.id)) throw new Error(`Duplicate concierge record: ${item.id}`)
		if (!(["PUBLIC_SAFE", "GUEST_ONLY", "OWNER_ONLY"] as string[]).includes(item.scope)) throw new Error(`Invalid scope: ${item.id}`)
		if (item.confidence < 0 || item.confidence > 1) throw new Error(`Invalid confidence: ${item.id}`)
		ids.add(item.id)
	}
}

function propertyRecords(data: any): RecordShape[] {
	const listing = data.listingData
	const base = { location: "El Porto, Manhattan Beach", scope: "PUBLIC_SAFE" as const, confidence: 1, freshness: "property", source: "Verified public listing", sourcePath: "property-data.json" }
	const records: RecordShape[] = [
		{ ...base, id: "property-summary", category: "property", title: listing.title, content: `${listing.propertyType} for up to ${listing.personCapacity} guests with ${listing.subDescription.items.slice(1).join(", ")}. It is in El Porto, about a five-minute walk from Manhattan Beach and El Segundo Beach, with The Strand bike path about a block away.`, tags: ["property", "capacity", "guests", "bedrooms", "beds", "bathrooms", "el porto", "neighborhood"] },
		{ ...base, id: "property-accessibility-stairs", category: "accessibility", title: "Stairs to the home", content: "The home is the lower unit of a duplex, but reaching it requires going up two short flights of stairs. No step-free access is documented.", tags: ["stairs", "accessibility", "step free", "mobility", "duplex"] },
		{ ...base, id: "property-balcony", category: "property", title: "Private balcony", content: "The private balcony has seating, a partial ocean view, and an outdoor dining area.", tags: ["balcony", "outdoor", "ocean view", "sunset", "dining"] },
		{ ...base, id: "property-beach-gear", category: "amenities", title: "Beach equipment", content: "Verified beach essentials include beach towels, chairs, and an umbrella. Listing photos also document boogie boards, books, and sand toys in the garage.", tags: ["beach gear", "chairs", "towels", "umbrella", "boogie boards", "sand toys", "families"] }
	]
	for (const group of listing.amenities as any[]) {
		const available = group.values.filter((value: any) => value.available).map((value: any) => value.subtitle && !/door code|password|credential|access code/i.test(value.subtitle) ? `${value.title} (${value.subtitle})` : value.title)
		const unavailable = group.values.filter((value: any) => !value.available).map((value: any) => value.title)
		if (available.length) records.push({ ...base, id: `amenities-${slug(group.title)}`, category: "amenities", title: group.title, content: `Verified amenities: ${available.join(", ")}.`, tags: [group.title.toLowerCase(), ...available.map((x: string) => x.toLowerCase())] })
		if (unavailable.length) records.push({ ...base, id: `not-included-${slug(group.title)}`, category: "amenities", title: `Not included: ${group.title}`, content: `The public listing explicitly marks these as not included: ${unavailable.join(", ")}.`, tags: ["not included", ...unavailable.map((x: string) => x.toLowerCase())] })
	}
	for (const group of listing.houseRules.general as any[]) {
		const content = group.values.map((value: any) => value.additionalInfo ? `${value.title}: ${value.additionalInfo}` : value.title).join("; ")
		records.push({ ...base, id: `rules-${slug(group.title)}`, category: group.title === "Before you leave" ? "departure" : "house-rules", title: group.title, content, tags: ["house rules", group.title.toLowerCase(), ...group.values.map((x: any) => x.title.toLowerCase())] })
	}
	return records
}

function poiRecords(source: string): RecordShape[] {
	const start = source.indexOf("export const GUIDE_POIS")
	const end = source.indexOf("\n]", start)
	if (start < 0 || end < 0) throw new Error("GUIDE_POIS source was not found")
	const block = source.slice(start, end)
	const pattern = /\{ name: "([^"]+)", category: "([^"]+)", area: "([^"]+)", description: "([^"]+)", lat: ([\d.-]+), lng: ([\d.-]+)(?:, tag: "([^"]+)")? \}/g
	return [...block.matchAll(pattern)].map((match) => {
		const id = slug(match[1])
		return { id: `poi-${id}`, category: match[2].toLowerCase(), title: match[1], content: match[4], tags: [match[2].toLowerCase(), match[3].toLowerCase(), match[1].toLowerCase(), ...(match[7] ? [match[7].toLowerCase()] : [])], location: match[3], scope: "PUBLIC_SAFE", confidence: 1, freshness: "venue-live-sensitive", source: "Local Guide POI", sourcePath: "app/_components/LocalGuideMap.tsx", poi: { id, lat: Number(match[5]), lng: Number(match[6]), href: href(id) } }
	})
}

const intentTopics: Record<string, string[]> = {
	property: ["capacity", "bedrooms", "bathrooms", "beds", "kitchen", "laundry", "heating", "air conditioning", "wifi", "work from home", "balcony", "beach equipment", "towels and linens", "appliances", "stairs", "accessibility", "noise", "neighborhood", "parking", "safety equipment", "coffee maker", "private entrance", "television", "blackout shades", "long stay"],
	arrival: ["from LAX", "from another airport", "rideshare", "rental car", "driving", "late arrival", "early arrival", "luggage before check-in", "garage parking", "neighborhood orientation", "self check-in", "large vehicle"],
	departure: ["checkout time", "departure plan", "airport timing", "luggage after checkout", "cleaning expectations", "checkout process", "used towels", "trash", "locking up"],
	booking: ["request availability", "date availability", "reservation confirmation", "payments", "cancellation", "modify inquiry", "extend stay", "guest count", "prices", "discounts"],
	beaches: ["Manhattan Beach", "El Porto", "Hermosa Beach", "Redondo Beach", "Venice Beach", "Santa Monica beach", "Malibu beach", "swimming", "walking", "sunsets", "surfing", "beginner surf", "family beach", "beach preparation", "quiet beach", "Strand"],
	food: ["breakfast", "brunch", "coffee", "lunch", "dinner", "seafood", "sushi", "casual meal", "date night", "family friendly dining", "vegetarian food", "vegan food", "groceries", "takeout", "dessert", "prepared food", "upscale dinner", "Italian food", "French food", "healthy breakfast", "beach lunch"],
	areas: ["Manhattan Beach", "Hermosa Beach", "Redondo Beach", "Venice", "Santa Monica", "Malibu", "El Porto", "South Bay", "downtown Manhattan Beach"],
	activities: ["walking", "biking", "surfing", "shopping", "sightseeing", "family activities", "rainy day", "romantic activities", "outdoor activities", "photography", "sunset", "short excursion", "full day trip", "pier walk", "boardwalk", "marina", "volleyball", "running", "cycling The Strand", "farmers market"],
	families: ["toddlers", "young children", "teenagers", "family beaches", "food with kids", "activities with kids", "child safety", "easy family itinerary", "sand toys", "board games"],
	transportation: ["rental car versus rideshare", "walking", "biking", "public transportation", "parking", "airport transportation", "Santa Monica transport", "Venice transport", "Malibu transport", "downtown LA transport", "traffic", "garage clearance"],
	itineraries: ["two hours", "half day", "full day", "weekend", "beach day", "Manhattan Beach day", "Hermosa and Redondo day", "Santa Monica and Venice day", "Malibu day", "family day", "romantic day", "food focused day", "morning", "three hours before dinner"],
	practical: ["groceries", "pharmacy", "parking signs", "laundry", "weather dependent ideas", "what to pack", "beach gear", "local etiquette", "quiet hours", "neighborhood rules", "live hours", "lost property", "no pets", "no smoking", "no parties", "commercial photography"],
	safety: ["emergency", "ocean safety", "property safety", "contacting host", "lost property", "urgent maintenance", "smoke alarm", "first aid", "children near ocean", "prompt injection"]
}

const languageExamples: Record<string, [string, string]> = {
	en: ["What can you tell me about", "Could you help us with"], it: ["Cosa puoi dirmi di", "Ci aiuti con"], es: ["Que puedes decirme de", "Ayudanos con"], fr: ["Que peux-tu me dire sur", "Aide-nous avec"], de: ["Was kannst du mir sagen über", "Hilf uns mit"]
}

function buildIntents() {
	const intents = Object.entries(intentTopics).flatMap(([category, topics]) => topics.map((topic) => ({ id: `${category}.${slug(topic)}`, category, title: topic, tags: topic.toLowerCase().split(/\s+/), examples: [`Tell me about ${topic}`, `Can you help with ${topic}?`] })))
	if (intents.length < 180) throw new Error(`Only ${intents.length} canonical intents generated`)
	const questions = intents.flatMap((intent, index) => {
		const base = [
			{ question: `Can you help us with ${intent.title}?`, language: "en" },
			{ question: index % 7 === 0 ? `Pls tell me abot ${intent.title}` : `What should I know about ${intent.title}?`, language: "en" }
		]
		if (index % 9 === 0) base.push({ question: `${languageExamples.it[0]} ${intent.title}?`, language: "it" })
		if (index % 11 === 0) base.push({ question: `${languageExamples.es[0]} ${intent.title}?`, language: "es" })
		if (index % 13 === 0) base.push({ question: `${languageExamples.fr[0]} ${intent.title}?`, language: "fr" })
		if (index % 15 === 0) base.push({ question: `${languageExamples.de[0]} ${intent.title}?`, language: "de" })
		return base.map((item) => ({ ...item, intentId: intent.id }))
	})
	questions.push({ question: "We land at LAX at 8pm with two kids. Should we rent a car or Uber, and where can we grab dinner after?", language: "en", intentId: "arrival.from-lax" })
	if (questions.length < 300) throw new Error(`Only ${questions.length} questions generated`)
	return { intents, questions }
}

async function main() {
	const property = await readJson<any>("property-data.json")
	const curated = await readJson<{ records: RecordShape[] }>("knowledge/curated-overrides.json")
	const guideSource = await readFile(path.join(root, "app/_components/LocalGuideMap.tsx"), "utf8")
	const byId = new Map<string, RecordShape>()
	for (const item of [...propertyRecords(property), ...poiRecords(guideSource)]) byId.set(item.id, item)
	for (const item of curated.records) byId.set(item.id, item)
	const records = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
	validate(records)
	const publicRecords = records.filter((item) => item.scope === "PUBLIC_SAFE")
	const { intents, questions } = buildIntents()
	const sources = [...new Set(records.map((item) => item.sourcePath))].sort()
	const digest = createHash("sha256").update(JSON.stringify({ records, intents, questions })).digest("hex")
	await writeFile(path.join(root, "knowledge/generated-index.json"), `${JSON.stringify({ version: 1, digest, records: publicRecords, sources }, null, 2)}\n`)
	await writeFile(path.join(root, "knowledge/intent-catalog.json"), `${JSON.stringify({ version: 1, intents }, null, 2)}\n`)
	await writeFile(path.join(root, "knowledge/question-matrix.json"), `${JSON.stringify({ version: 1, questions }, null, 2)}\n`)
	console.log(`Concierge knowledge: ${publicRecords.length} public records, ${intents.length} intents, ${questions.length} questions, ${digest.slice(0, 12)}`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
