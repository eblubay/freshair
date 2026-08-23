import index from "@/knowledge/generated-index.json"
import type { CanonicalGuestQA, ConciergeRecord, ConversationTurn } from "@/lib/concierge-types"

const records = (index.records as ConciergeRecord[]).filter((item) => item.scope === "PUBLIC_SAFE")
const qas = (index.qas as CanonicalGuestQA[]).filter((item) => item.publicSafe)
const stop = new Set("a an and are as at be before can could do for from give have how i in is it me my of on or our should tell the there this to us we what when where which with you your about please plan best good nearby want would like looking something".split(" "))
const aliases: Record<string, string[]> = {
	people: ["guests", "capacity"], person: ["guests", "capacity"], sleeps: ["guests", "capacity"], rooms: ["bedrooms"], bath: ["bathrooms"],
	uber: ["rideshare"], lyft: ["rideshare"], taxi: ["rideshare"], car: ["driving", "rental"], airport: ["lax"], aeroporto: ["lax", "airport"], aeropuerto: ["lax", "airport"], flughafen: ["lax", "airport"],
	wifi: ["internet"], kids: ["family", "children", "sand toys"], child: ["family", "children"], toddler: ["family", "children"], teens: ["teenagers", "family"], bambini: ["family", "children"], ninos: ["family", "children"], enfants: ["family", "children"], kinder: ["family", "children"],
	eat: ["food", "dining", "breakfast", "dinner"], eats: ["food", "dining"], restaurant: ["food", "dining"], restaurants: ["food", "dining"], colazione: ["breakfast"], cafe: ["coffee"], brekfast: ["breakfast"], coffe: ["coffee"], casual: ["relaxed", "beach lunch"],
	beach: ["beaches", "ocean", "swimming", "surf"], beaches: ["beach", "ocean"], spiaggia: ["beach", "ocean"], playa: ["beach", "ocean"], plage: ["beach", "ocean"], strand: ["beach", "ocean", "cycling", "walking"],
	checkout: ["departure"], checkin: ["arrival"], booking: ["reservation", "availability", "inquiry"], booked: ["reservation", "confirmation"], cancel: ["cancellation", "refund"], garage: ["parking"], park: ["parking"], stairs: ["accessibility"],
	elporto: ["el", "porto", "manhattan"], downtown: ["manhattan", "shopping", "dining"], sm: ["santa", "monica"], sunset: ["ocean", "view", "evening"], surf: ["surfing", "el porto"], romantic: ["sunset", "ocean view", "upscale dinner"]
}
const categoryAliases: Record<string, string[]> = { food: ["food", "breakfast", "coffee"], dining: ["food", "breakfast"], family: ["family", "beaches", "activities"], transport: ["transportation", "airports", "parking"], stay: ["property", "amenities", "house-rules"], itinerary: ["area", "activities", "attractions", "beaches", "food"] }

export function normalize(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() }
const stem = (token: string) => token.length > 4 ? token.replace(/(ies|ing|ers|er|es|s)$/i, (ending) => ending === "ies" ? "y" : "") : token
function tokens(value: string) { const base = normalize(value).split(" ").filter((token) => token.length > 1 && !stop.has(token)); return [...new Set(base.flatMap((token) => [token, stem(token), ...(aliases[token] ?? [])]))] }
function trigrams(value: string) { const padded = `  ${normalize(value)} `; return new Set(Array.from({ length: Math.max(0, padded.length - 2) }, (_, index) => padded.slice(index, index + 3))) }
function fuzzy(a: string, b: string) { const one = trigrams(a); const two = trigrams(b); if (!one.size || !two.size) return 0; let overlap = 0; for (const part of one) if (two.has(part)) overlap++; return (2 * overlap) / (one.size + two.size) }
function requestedCategories(query: string) { return Object.entries(categoryAliases).flatMap(([alias, categories]) => query.includes(alias) ? categories : []) }

export function retrieveCanonicalQAs(question: string, history: ConversationTurn[] = [], limit = 4) {
	const recent = history.slice(-4).map((item) => item.content).join(" ")
	const context = question.split(/\s+/).length < 10 ? `${recent} ${question}` : question
	const query = normalize(context)
	const queryTokens = tokens(context)
	return qas.map((qa) => {
		const questions = [qa.canonicalQuestion, ...qa.alternativeQuestions]
		const searchable = normalize(`${qa.canonicalQuestion} ${qa.tags.join(" ")} ${qa.locations.join(" ")}`)
		const overlap = queryTokens.reduce((score, token) => score + (searchable.includes(token) ? (qa.tags.some((tag) => normalize(tag).includes(token)) ? 5 : 3) : 0), 0)
		const phrase = questions.reduce((score, candidate) => Math.max(score, fuzzy(query, normalize(candidate)) * 20), 0)
		// Exact normalized wording is a legitimate high-confidence signal for curated natural
		// variants. It is deliberately independent of QA ids and canonical-answer content.
		const curatedWording = questions.some((candidate) => normalize(candidate) === query) ? 100 : 0
		const location = qa.locations.some((location) => query.includes(normalize(location).split(" ")[0])) ? 5 : 0
		return { qa, score: overlap + phrase + curatedWording + location }
	}).filter((result) => result.score >= 6).sort((a, b) => b.score - a.score || a.qa.id.localeCompare(b.qa.id)).slice(0, limit)
}

export function retrieve(question: string, history: ConversationTurn[] = [], limit = 8) {
	const recent = history.slice(-6).map((item) => item.content).join(" ")
	const isFollowUp = question.split(/\s+/).length < 10 || /which|one|closest|that|those|kids|beach/i.test(question)
	const context = isFollowUp ? `${recent} ${question}` : question
	const query = normalize(context)
	const currentQuery = normalize(question)
	const queryTokens = tokens(context)
	const categories = requestedCategories(query)
	const ranked = records.map((record) => {
		const searchable = normalize(`${record.title} ${record.category} ${record.location} ${record.tags.join(" ")} ${record.content}`)
		const exact = queryTokens.reduce((score, token) => score + (searchable.includes(token) ? (record.tags.some((tag) => normalize(tag).includes(token)) ? 4 : 2) : 0), 0)
		const phrase = record.tags.reduce((score, tag) => score + (query.includes(normalize(tag)) ? 5 : 0), 0)
		const locations = ["manhattan", "hermosa", "redondo", "venice", "santa monica", "malibu", "el porto", "lax", "south bay"]
		const location = locations.some((place) => query.includes(place) && normalize(record.location).includes(place.split(" ")[0])) ? 8 : 0
		const currentBoost = tokens(question).reduce((score, token) => score + (searchable.includes(token) ? 1.5 : 0), 0)
		const category = categories.includes(record.category) ? 3 : 0
		const baseBoost = record.facet ? 0 : 1
		return { record, score: exact + phrase + location + currentBoost + category + baseBoost + fuzzy(currentQuery, `${record.title} ${record.tags.join(" ")}`) * 5 }
	}).filter((result) => result.score >= 3).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
	const selected: typeof ranked = []
	const parentCounts = new Map<string, number>()
	for (const result of ranked) {
		const parent = result.record.parentId ?? result.record.id
		if ((parentCounts.get(parent) ?? 0) >= 1) continue
		selected.push(result); parentCounts.set(parent, 1)
		if (selected.length >= limit) break
	}
	return selected
}

export function publicKnowledge() { return records }
export function publicCanonicalQAs() { return qas }
export function knowledgeByIds(ids: string[]) { const wanted = new Set(ids); return records.filter((record) => wanted.has(record.id)) }
