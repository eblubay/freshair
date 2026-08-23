import index from "@/knowledge/generated-index.json"
import type { ConciergeRecord, ConversationTurn } from "@/lib/concierge-types"

const records = (index.records as ConciergeRecord[]).filter((item) => item.scope === "PUBLIC_SAFE")
const stop = new Set("a an and are as at be before can could do for from give have how i in is it me my of on or our should tell the there this to us we what when where which with you your about please plan best good nearby".split(" "))
const synonyms: Record<string, string[]> = { people: ["guests", "capacity"], person: ["guests", "capacity"], uber: ["rideshare"], taxi: ["rideshare"], car: ["driving", "rental"], airport: ["lax"], aeroporto: ["lax", "airport"], aeropuerto: ["lax", "airport"], flughafen: ["lax", "airport"], wifi: ["internet"], kids: ["family", "children", "sand toys"], child: ["family", "children"], bambini: ["family", "children"], ninos: ["family", "children"], enfants: ["family", "children"], kinder: ["family", "children"], eat: ["food", "dining", "breakfast", "dinner"], restaurant: ["food", "dining"], colazione: ["breakfast"], cafe: ["coffee"], brekfast: ["breakfast"], coffe: ["coffee"], beach: ["ocean", "swimming", "surf"], spiaggia: ["beach", "ocean"], playa: ["beach", "ocean"], plage: ["beach", "ocean"], strand: ["beach", "ocean"], checkout: ["departure"], booking: ["reservation", "availability", "inquiry"], cancel: ["cancellation", "refund"], garage: ["parking"], stairs: ["accessibility"] }

export function normalize(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() }
function tokens(value: string) { const base = normalize(value).split(" ").filter((token) => token.length > 1 && !stop.has(token)); return [...new Set(base.flatMap((token) => [token, ...(synonyms[token] ?? [])]))] }
function trigrams(value: string) { const padded = `  ${normalize(value)} `; return new Set(Array.from({ length: Math.max(0, padded.length - 2) }, (_, index) => padded.slice(index, index + 3))) }
function fuzzy(a: string, b: string) { const one = trigrams(a); const two = trigrams(b); if (!one.size || !two.size) return 0; let overlap = 0; for (const part of one) if (two.has(part)) overlap++; return (2 * overlap) / (one.size + two.size) }

export function retrieve(question: string, history: ConversationTurn[] = [], limit = 6) {
	const recent = history.slice(-4).map((item) => item.content).join(" ")
	const context = question.split(/\s+/).length < 8 ? `${recent} ${question}` : question
	const query = normalize(context)
	const queryTokens = tokens(context)
	return records.map((record) => {
		const searchable = normalize(`${record.title} ${record.category} ${record.location} ${record.tags.join(" ")} ${record.content}`)
		const exact = queryTokens.reduce((score, token) => score + (searchable.includes(token) ? (record.tags.some((tag) => normalize(tag).includes(token)) ? 4 : 2) : 0), 0)
		const phrase = record.tags.reduce((score, tag) => score + (query.includes(normalize(tag)) ? 5 : 0), 0)
		const location = ["manhattan", "hermosa", "redondo", "venice", "monica", "malibu", "porto", "lax"].some((place) => query.includes(place) && normalize(record.location).includes(place)) ? 6 : 0
		return { record, score: exact + phrase + location + fuzzy(question, `${record.title} ${record.tags.join(" ")}`) * 4 }
	}).filter((result) => result.score >= 2.5).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id)).slice(0, limit)
}

export function publicKnowledge() { return records }
