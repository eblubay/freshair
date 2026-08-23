import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

type Scope = "PUBLIC_SAFE" | "GUEST_ONLY" | "OWNER_ONLY"
type RecordShape = { id: string; category: string; title: string; content: string; tags: string[]; location: string; scope: Scope; confidence: number; freshness: string; source: string; sourcePath: string; parentId?: string; facet?: string; poi?: { id: string; lat: number; lng: number; href: string } }
type CanonicalQA = { id: string; category: string; canonicalQuestion: string; answer: string; alternativeQuestions: string[]; tags: string[]; locations: string[]; sourceIds: string[]; publicSafe: true; liveDataDependent: boolean; knowledgeIds: string[] }
type QualityCase = { question: string; expectedKnowledgeIds: string[]; expectedSourceIds: string[]; expectedTerms: string[]; liveDataDependent: boolean; safety: "grounded" | "live" }
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
		for (const value of group.values as any[]) {
			const detail = value.subtitle && !/door code|password|credential|access code/i.test(value.subtitle) ? ` ${value.subtitle}.` : ""
			records.push({ ...base, id: `amenity-${slug(value.title)}`, parentId: value.available ? `amenities-${slug(group.title)}` : `not-included-${slug(group.title)}`, facet: value.available ? "available" : "not-included", category: "amenities", title: value.title, content: value.available ? `${value.title} is a verified amenity.${detail}` : `${value.title} is explicitly marked as not included in the public listing.`, tags: [group.title.toLowerCase(), value.title.toLowerCase(), value.available ? "available" : "not included"] })
		}
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
	return [...block.matchAll(pattern)].flatMap((match) => {
		const id = slug(match[1])
		const base: RecordShape = { id: `poi-${id}`, category: match[2].toLowerCase(), title: match[1], content: match[4], tags: [match[2].toLowerCase(), match[3].toLowerCase(), match[1].toLowerCase(), ...(match[7] ? [match[7].toLowerCase()] : [])], location: match[3], scope: "PUBLIC_SAFE", confidence: 1, freshness: "venue-live-sensitive", source: "Local Guide POI", sourcePath: "app/_components/LocalGuideMap.tsx", poi: { id, lat: Number(match[5]), lng: Number(match[6]), href: href(id) } }
		return [
			base,
			{ ...base, id: `poi-area-${id}`, parentId: base.id, facet: "pairing", content: `${match[1]} is in ${match[3]}. It can be paired with another verified stop in the same area to avoid unnecessary backtracking.`, tags: [...base.tags, "itinerary", "pair", "same area", "nearby"] },
			{ ...base, id: `poi-fit-${id}`, parentId: base.id, facet: "experience", content: `${match[1]} is best considered when you want ${match[4].charAt(0).toLowerCase()}${match[4].slice(1)}`, tags: [...base.tags, "experience", ...match[4].toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 3)] }
		]
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

function questionFor(record: RecordShape) {
	if (record.facet === "pairing") return `How would ${record.title} fit into a day in ${record.location}?`
	if (record.facet === "experience") return `What kind of experience is ${record.title} best for?`
	if (record.category === "amenities") return `What does the listing confirm about ${record.title.toLowerCase()}?`
	if (record.category === "house-rules" || record.category === "departure") return `What should guests know about ${record.title.toLowerCase()}?`
	if (record.category === "booking") return `What should I know about ${record.title.toLowerCase()}?`
	if (record.poi) return `Would ${record.title} suit the kind of outing we are planning?`
	return `What should guests know about ${record.title}?`
}

function canonicalQAs(records: RecordShape[]): CanonicalQA[] {
	const recordQas: CanonicalQA[] = records.map((record, index): CanonicalQA => {
		const canonicalQuestion = questionFor(record)
		const subject = record.title
		const alternatives = record.facet === "pairing"
			? [`We're visiting ${record.location}; what could we combine with ${subject}?`, `Can ${subject} be part of a low-backtracking route?`, `Where would you place ${subject} in our itinerary?`]
			: record.facet === "experience"
				? [`Who would enjoy ${subject} most?`, `What would make us choose ${subject}?`, `Does ${subject} match a ${record.tags[index % record.tags.length] ?? record.category} outing?`]
				: record.category === "amenities" && !record.facet
					? [`Which ${subject.toLowerCase()} amenities are actually included?`, `What does the listing provide under ${subject.toLowerCase()}?`, `Help us understand the verified ${subject.toLowerCase()} setup.`]
					: record.category === "amenities"
						? [`Is ${subject.toLowerCase()} one of the confirmed amenities?`, `Do we need to pack ${subject.toLowerCase()}, or is it provided?`, `The listing mentions ${subject.toLowerCase()}—can we rely on that?`]
					: record.poi
						? [`We're considering ${subject}; what is it like?`, `Is ${subject} one of the places in the verified guide?`, `Give us the practical reason to choose ${subject}.`]
						: [`Could you explain ${subject.toLowerCase()} in practical terms?`, `What should we plan for regarding ${subject.toLowerCase()}?`, `What has the host actually verified about ${subject.toLowerCase()}?`]
		return {
			id: `qa-${record.id}`,
			category: record.category,
			canonicalQuestion,
			answer: record.content,
			alternativeQuestions: alternatives,
			tags: [...new Set([record.category, subject.toLowerCase(), ...record.tags])],
			locations: [record.location],
			sourceIds: [record.sourcePath],
			publicSafe: true,
			liveDataDependent: /live-sensitive|venue-live-sensitive/.test(record.freshness),
			knowledgeIds: [record.id]
		}
	})
	const find = (id: string) => records.find((record) => record.id === id)
	const transverse: CanonicalQA[] = []
	const add = (id: string, category: string, question: string, answer: string, alternatives: string[], ids: string[], tags: string[], locations: string[] = ["South Bay"], live = false) => {
		const selected = ids.map(find).filter((record): record is RecordShape => Boolean(record))
		if (selected.length !== ids.length) throw new Error(`Missing knowledge for ${id}`)
		transverse.push({ id: `qa-guide-${id}`, category, canonicalQuestion: question, answer, alternativeQuestions: alternatives, tags, locations, sourceIds: [...new Set(selected.map((record) => record.sourcePath))], publicSafe: true, liveDataDependent: live, knowledgeIds: ids })
	}
	add("breakfast-ranking", "recommendations", "Which verified breakfast spots should we shortlist?", "For a classic breakfast near downtown and the beach, start with Uncle Bill's Pancake House. For a casual North Manhattan Beach option close to the coast, choose Sloopy's Beach Cafe; for lighter bowls or smoothies, The Hive is the better fit. Check current hours directly.", ["Where would you send us for breakfast near the beach?", "Rank three breakfast choices for classic, casual and healthy tastes.", "We want breakfast, but not three identical suggestions—what are the trade-offs?"], ["poi-uncle-bill-s-pancake-house", "poi-sloopy-s-beach-cafe", "poi-the-hive"], ["breakfast", "ranking", "healthy", "classic", "beach"], ["Manhattan Beach"], true)
	add("family-redondo", "recommendations", "What is a simple verified Redondo outing with children?", "Walk the Redondo Beach Pier and King Harbor waterfront, then choose Jus' Poke for a casual beach lunch. Seaside Lagoon is seasonal, so confirm current operating information before making it the centerpiece.", ["Plan an easy Redondo afternoon for our family.", "What can we combine in Redondo without dragging the kids all over town?", "Give us a pier, harbor and casual lunch plan in Redondo."], ["poi-redondo-beach-pier", "poi-king-harbor", "poi-jus-poke", "poi-seaside-lagoon"], ["family", "kids", "redondo", "pier", "casual lunch"], ["Redondo Beach"], true)
	add("date-night", "recommendations", "Which verified places fit a date night near Manhattan Beach?", "The Strand House is the verified choice for coastal dining and ocean views; The Arthur J fits a more upscale steakhouse dinner; Fishing With Dynamite is the seafood-and-oyster option near the Pier. Choose by atmosphere and cuisine, then verify hours and reservations directly.", ["Compare the best verified Manhattan Beach dinner options for a couple.", "Where should we go for ocean views, steak or seafood on date night?", "Can you rank romantic dinner choices without inventing availability?"], ["poi-the-strand-house", "poi-the-arthur-j", "poi-fishing-with-dynamite"], ["date night", "romantic", "dinner", "ocean view", "seafood"], ["Manhattan Beach"], true)
	add("sushi-gap", "recommendations", "Can you recommend a verified sushi restaurant?", "The current verified Local Guide does not include a sushi restaurant, so I cannot responsibly name one. Ask the host to confirm a current recommendation before you go.", ["What's your best sushi pick nearby?", "Where can we get sushi tonight?", "Is there a sushi place in the verified guide?"], ["area-manhattan-beach"], ["sushi", "japanese", "verified recommendation"], ["Manhattan Beach"], true)
	add("nightlife-verified", "recommendations", "What verified options work for drinks or a livelier evening?", "For a livelier verified evening, Hermosa Beach's pier area is the clearest area-level choice. Specific verified venues with cocktails include Manhattan Beach Post, Rockefeller Manhattan Beach, Steak & Whisky, and Riviera House. These are dining venues, not a promise of nightclub entertainment; verify hours and events directly.", ["Where can we go out at night using only verified places?", "Any verified cocktail spots or lively areas?", "Plan drinks without making up bars that are not in the guide."], ["area-hermosa-beach", "poi-manhattan-beach-post", "poi-rockefeller-manhattan-beach", "poi-steak-whisky-american-tavern", "poi-riviera-house"], ["nightlife", "cocktails", "drinks", "evening", "verified"], ["South Bay"], true)
	add("two-days", "itineraries", "How should we spend two days without excessive driving?", "Day 1: stay local with El Porto Beach, The Strand and Manhattan Beach Pier, then dinner downtown. Day 2: follow the coast south to Hermosa Beach Pier, Redondo Beach Pier and King Harbor. Keep each day geographically grouped and check live traffic, hours and beach conditions.", ["Build us a practical two-day South Bay itinerary.", "We have a weekend—can you group verified stops by area?", "What is a low-backtracking 2 day plan from the house?"], ["poi-el-porto-beach", "poi-the-strand", "poi-manhattan-beach-pier", "poi-hermosa-beach-pier", "poi-redondo-beach-pier", "poi-king-harbor"], ["two days", "weekend", "itinerary", "low backtracking"], ["South Bay"], true)
	add("three-days", "itineraries", "Can you build a balanced three-day coastal itinerary?", "Day 1: El Porto Beach, The Strand and Manhattan Beach Pier. Day 2: Hermosa Beach Pier, Redondo Beach Pier and King Harbor. Day 3: pair Venice Beach Boardwalk and Venice Canals with Santa Monica Pier. This keeps each day clustered; check live traffic and venue conditions.", ["Plan 3 days with local beaches plus Venice and Santa Monica.", "How do we divide the verified coastal sights across three days?", "Give us a three day itinerary that avoids zig-zagging."], ["poi-el-porto-beach", "poi-the-strand", "poi-manhattan-beach-pier", "poi-hermosa-beach-pier", "poi-redondo-beach-pier", "poi-king-harbor", "poi-venice-beach-boardwalk", "poi-venice-canals", "poi-santa-monica-pier"], ["three days", "itinerary", "venice", "santa monica", "south bay"], ["Los Angeles coast"], true)
	add("family-coffee-beach", "recommendations", "Where can a family combine a nearby beach walk, coffee and an easy meal?", "Start at El Porto Beach for the closest verified beach experience, use The Strand for an easy walk, stop at Two Guns Espresso for coffee, and choose Sloopy's Beach Cafe for a casual nearby breakfast or lunch. Supervise children at the ocean and check current hours.", ["We have kids and want coffee, a beach walk and casual food nearby.", "Make us an easy family route near El Porto with minimal driving.", "Which verified stops satisfy beach, coffee and kid-friendly pacing?"], ["poi-el-porto-beach", "poi-the-strand", "poi-two-guns-espresso", "poi-sloopy-s-beach-cafe", "safety-ocean"], ["family", "kids", "coffee", "beach", "casual", "nearby"], ["El Porto", "Manhattan Beach"], true)
	return [...recordQas, ...transverse]
}

function qaDocument(qas: CanonicalQA[]) {
	const groups = new Map<string, CanonicalQA[]>()
	for (const qa of qas) groups.set(qa.category, [...(groups.get(qa.category) ?? []), qa])
	const sections = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, entries]) => {
		const body = entries.map((qa) => `### ${qa.id}\n\n**QUESTION**\n\n${qa.canonicalQuestion}\n\n**ANSWER**\n\n${qa.answer}\n\n**ALTERNATIVE QUESTIONS**\n\n${qa.alternativeQuestions.map((question) => `- ${question}`).join("\n")}\n\n**SOURCES:** ${qa.sourceIds.join(", ")}\n\n**LIVE DATA DEPENDENT:** ${qa.liveDataDependent ? "Yes" : "No"}`).join("\n\n---\n\n")
		return `## ${category}\n\n${body}`
	}).join("\n\n")
	return `# ShellByTheShore Guest Q&A\n\nGenerated curated guest library. Every answer is derived only from the public property listing, Local Guide, curated public overrides, or an existing public page. Venue hours, prices, traffic, weather, and availability must be checked live.\n\n**Canonical entries:** ${qas.length}\n\n${sections}\n`
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
	const qas = canonicalQAs(publicRecords)
	if (qas.length < 250 || qas.some((qa) => qa.alternativeQuestions.length < 3)) throw new Error(`Canonical Q&A requirements failed: ${qas.length}`)
	const { intents, questions } = buildIntents()
	const sources = [...new Set(records.map((item) => item.sourcePath))].sort()
	const digest = createHash("sha256").update(JSON.stringify({ records, qas, intents, questions })).digest("hex")
	await writeFile(path.join(root, "knowledge/generated-index.json"), `${JSON.stringify({ version: 2, digest, records: publicRecords, qas, sources }, null, 2)}\n`)
	await writeFile(path.join(root, "knowledge/canonical-guest-qa.json"), `${JSON.stringify({ version: 1, digest, qas }, null, 2)}\n`)
	await writeFile(path.join(root, "knowledge/intent-catalog.json"), `${JSON.stringify({ version: 1, intents }, null, 2)}\n`)
	const recordById = new Map(records.map((record) => [record.id, record]))
	const answerTerm = (record: RecordShape) => record.poi ? record.title : record.content.match(/(?:amenities:|included:|expectations:)?\s*([^,.;:]{3,60})/i)?.[1]?.trim() || record.title
	const qualityCase = (qa: CanonicalQA, question: string): QualityCase => ({ question, expectedKnowledgeIds: qa.knowledgeIds, expectedSourceIds: qa.sourceIds, expectedTerms: qa.knowledgeIds.map((id) => recordById.get(id)).filter((record): record is RecordShape => Boolean(record)).map(answerTerm).slice(0, 2), liveDataDependent: qa.liveDataDependent, safety: qa.liveDataDependent ? "live" : "grounded" })
	// Only natural variants are graded: no canonical wording, QA id, or answer text is exposed to the harness.
	const qualityQuestions = qas.flatMap((qa) => qa.alternativeQuestions.map((question) => qualityCase(qa, question)))
	await writeFile(path.join(root, "knowledge/question-matrix.json"), `${JSON.stringify({ version: 2, questions, qualityQuestions }, null, 2)}\n`)
	await writeFile(path.join(root, "docs/SHELLBYTHESHORE-GUEST-QA.md"), qaDocument(qas))
	console.log(`Concierge knowledge: ${publicRecords.length} records, ${qas.length} canonical Q&A, ${qas.reduce((count, qa) => count + qa.alternativeQuestions.length, 0)} alternatives, ${qualityQuestions.length} quality questions, ${digest.slice(0, 12)}`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
