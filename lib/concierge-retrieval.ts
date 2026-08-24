import index from "@/knowledge/generated-index.json"
import type { CanonicalGuestQA, ConciergeLanguage, ConciergeRecord, ConversationTurn } from "@/lib/concierge-types"

const records = (index.records as ConciergeRecord[]).filter((item) => item.scope === "PUBLIC_SAFE")
const qas = (index.qas as CanonicalGuestQA[]).filter((item) => item.publicSafe)
const stop = new Set("a an and are as at be before can could do for from give have how i in is it me my of on or our should tell the there this to us we what when where which with you your about please plan best good nearby want would like looking something".split(" "))
const aliases: Record<string, string[]> = {
	people: ["guests", "capacity"], person: ["guests", "capacity"], sleeps: ["guests", "capacity"], rooms: ["bedrooms"], bath: ["bathrooms"],
	uber: ["rideshare"], lyft: ["rideshare"], taxi: ["rideshare"], car: ["driving", "rental"], airport: ["lax"], aeroporto: ["lax", "airport"], aeropuerto: ["lax", "airport"], flughafen: ["lax", "airport"],
	wifi: ["internet"], kids: ["family", "children", "sand toys"], child: ["family", "children"], toddler: ["family", "children"], teens: ["teenagers", "family"], bambini: ["family", "children"], ninos: ["family", "children"], enfants: ["family", "children"], kinder: ["family", "children"],
	eat: ["food", "dining", "breakfast", "dinner"], eats: ["food", "dining"], restaurant: ["food", "dining"], restaurants: ["food", "dining"], colazione: ["breakfast"], cafe: ["coffee"], brekfast: ["breakfast"], coffe: ["coffee"], casual: ["relaxed", "beach lunch"],
	beach: ["beaches", "ocean", "swimming", "surf"], beaches: ["beach", "ocean"], spiaggia: ["beach", "ocean"], playa: ["beach", "ocean"], plage: ["beach", "ocean"], strand: ["beach", "ocean", "cycling", "walking"],
	checkout: ["departure"], checkin: ["arrival"], booking: ["reservation", "availability", "inquiry"], booked: ["reservation", "confirmation"], cancel: ["cancellation", "refund"], garage: ["parking"], park: ["parking"], stairs: ["accessibility"], night: ["evening", "nightlife", "drinks"], nightlife: ["evening", "drinks", "cocktails"],
	elporto: ["el", "porto", "manhattan"], downtown: ["manhattan", "shopping", "dining"], sm: ["santa", "monica"], sunset: ["ocean", "view", "evening"], surf: ["surfing", "el porto"], romantic: ["sunset", "ocean view", "upscale dinner"]
}
const categoryAliases: Record<string, string[]> = { food: ["food", "breakfast", "coffee"], dining: ["food", "breakfast"], family: ["family", "beaches", "activities"], transport: ["transportation", "airports", "parking"], stay: ["property", "amenities", "house-rules"], itinerary: ["area", "activities", "attractions", "beaches", "food"] }

export type PrimaryIntent = "breakfast" | "food" | "coffee" | "parking" | "beach" | "transport" | "groceries" | "itinerary" | "family"
type IntentDefinition = { patterns: RegExp[]; categories: string[]; preferredIds: string[]; priority: number }

// These patterns describe an explicit guest need. Place names (including names containing
// "Beach") and audience words are deliberately absent: they influence ranking, but cannot
// turn "breakfast near Manhattan Beach with kids" into a beach or family request.
const primaryIntents: Record<PrimaryIntent, IntentDefinition> = {
	breakfast: { patterns: [/\b(breakfast|brunch|pancakes?)\b/i, /\b(colazione|brunch)\b/i, /\b(desayuno|desayunar|brunch)\b/i, /\b(petit[ -]d[eé]jeuner|brunch)\b/i, /\b(fr[uü]hst[uü]ck|fr[uü]hst[uü]cken|brunch)\b/i], categories: ["breakfast", "recommendations"], preferredIds: ["v2-breakfast-shortlist"], priority: 100 },
	coffee: { patterns: [/\b(coffee|espresso|cappuccino|cafe)\b/i, /\b(caff[eè]|espresso|cappuccino)\b/i, /\b(caf[eé]|espresso)\b/i, /\b(kaffee|espresso|cappuccino)\b/i], categories: ["coffee", "recommendations"], preferredIds: ["v2-coffee-mb"], priority: 95 },
	groceries: { patterns: [/\b(grocer(?:y|ies)|supermarket|food market)\b/i, /\b(spesa|supermercato|alimentari)\b/i, /\b(supermercado|comestibles|hacer la compra)\b/i, /\b(supermarch[eé]|courses|[eé]picerie)\b/i, /\b(supermarkt|lebensmittel|einkaufen)\b/i], categories: ["groceries"], preferredIds: ["v2-groceries-mb"], priority: 94 },
	parking: { patterns: [/\b(parking|park the car|garage)\b/i, /\b(parcheggio|parcheggiare|garage)\b/i, /\b(aparcamiento|estacionamiento|aparcar|garaje)\b/i, /\b(stationnement|garer|garage)\b/i, /\b(parken|parkplatz|garage)\b/i], categories: ["parking"], preferredIds: ["v2-parking-home", "v2-manhattan-beach-public-parking"], priority: 93 },
	transport: { patterns: [/\b(airport|lax|lyft|taxi|rideshare|rental car|public transport|bus)\b/i, /\b(aeroporto|taxi|trasporto|autobus|noleggio auto)\b/i, /\b(aeropuerto|taxi|transporte|autob[uú]s|coche de alquiler)\b/i, /\b(a[eé]roport|taxi|transport|bus|voiture de location)\b/i, /\b(flughafen|taxi|verkehrsmittel|bus|mietwagen)\b/i], categories: ["transportation", "airports"], preferredIds: ["v2-lax", "v2-car-or-rideshare"], priority: 92 },
	food: { patterns: [/\b(restaurants?|dinner|lunch|seafood|sushi|where (?:can|should) (?:we|i) eat|place to eat|dining)\b/i, /\b(ristorant[ei]|cena|pranzo|pesce|sushi|mangiare)\b/i, /\b(restaurantes?|cena|almuerzo|mariscos|sushi|comer)\b/i, /\b(restaurants?|d[iî]ner|d[eé]jeuner|fruits de mer|sushi|manger)\b/i, /\b(restaurants?|abendessen|mittagessen|meeresfr[uü]chte|sushi|essen)\b/i], categories: ["food", "recommendations"], preferredIds: ["v2-sushi", "v2-seafood", "v2-date-night"], priority: 90 },
	beach: { patterns: [/\b(which|best|recommend|go to|visit|safe|swim(?:ming)?|surf(?:ing)?)\s+(?:[a-z]+\s+){0,2}beach\b|\bbeaches\b/i, /\b(quale|migliore|consigli|andare|visitare|sicura|nuotare|fare surf)\s+(?:\w+\s+){0,2}spiaggi[ae]\b/i, /\b(qu[eé]|cu[aá]l|mejor|recomiend|ir|visitar|segura|nadar|surfear)\s+(?:\w+\s+){0,2}playa\b|\bplayas\b/i, /\b(quelle|meilleure|conseill|aller|visiter|s[uû]re|nager|surfer)\s+(?:\w+\s+){0,2}plage\b|\bplages\b/i, /\b(welche(?:n)?|beste(?:n)?|empfiehl|gehen|besuchen|sicher|schwimmen|surfen)\s+(?:\w+\s+){0,2}strand\b|\bstr[aä]nde\b/i], categories: ["beaches", "safety"], preferredIds: ["v2-el-porto-beach", "v2-ocean-safety"], priority: 80 },
	itinerary: { patterns: [/\b(plan|itinerary|day trip|half day|full day|what (?:can|should) we do|things to do|explore)\b/i, /\b(organizza|itinerario|cosa possiamo fare|cose da fare|esplorare)\b/i, /\b(itinerario|plan(?:ea|ear|ifica|ificar)|qu[eé] podemos hacer|cosas que hacer|explorar)\b/i, /\b(pr[eé]parez|itin[eé]raire|que pouvons-nous faire|choses [aà] faire|explorer)\b/i, /\b(planen|reiseplan|tagesausflug|was k[oö]nnen wir machen|unternehmungen|erkunden)\b/i], categories: ["itineraries", "area", "activities", "attractions"], preferredIds: ["v2-one-day-local", "v2-family-local", "v2-family-redondo"], priority: 97 },
	family: { patterns: [/\b(family activities|activities (?:for|can) (?:kids|children)|what (?:can|should) (?:we|kids|children) do)\b/i, /\b(attivit[aà].{0,30}bambini|cosa (?:possiamo|possono) fare (?:i bambini|con i bambini))\b/i, /\b(actividades.{0,30}ni[nñ]os|qu[eé] (?:podemos|pueden) hacer (?:los ni[nñ]os|con ni[nñ]os))\b/i, /\b(activit[eé]s.{0,30}enfants|que (?:pouvons-nous|peuvent) faire (?:les enfants|avec des enfants))\b/i, /\b(aktivit[aä]ten.{0,30}kinder|familienaktivit[aä]ten|was k[oö]nnen (?:wir|kinder) machen)\b/i], categories: ["recommendations", "activities", "beaches"], preferredIds: ["v2-family-local", "v2-family-redondo"], priority: 60 }
}

export type PrimaryIntentDetection = { intent?: PrimaryIntent; confidence: number; matched: string[] }
export function detectPrimaryIntent(question: string): PrimaryIntentDetection {
	const normalized = normalize(question)
	const matches = (Object.entries(primaryIntents) as [PrimaryIntent, IntentDefinition][]).flatMap(([intent, definition]) => {
		const matched = definition.patterns.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source)
		return matched.length ? [{ intent, matched, priority: definition.priority }] : []
	}).sort((a, b) => b.priority - a.priority)
	if (!matches.length) return { confidence: 0, matched: [] }
	if (matches[0].intent === "beach" && /\b(equipment|gear|attrezzatura|equipo|equipement|ausrustung)\b/.test(normalized)) return { confidence: 0, matched: [] }
	if (matches[0].intent === "itinerary" && /\b(before leaving|prima di partire|antes de salir|avant de partir|vor der abreise)\b/.test(normalized)) return { confidence: 0, matched: [] }
	if (matches[0].intent === "itinerary" && /\b(before (?:our |the )?itinerary|prima dell itinerario|antes del itinerario|avant l itineraire|vor dem reiseplan)\b/.test(normalized)) {
		const alternative = matches.find((match) => match.intent !== "itinerary")
		return alternative ? { intent: alternative.intent, confidence: 0.9, matched: alternative.matched } : { confidence: 0, matched: [] }
	}
	return { intent: matches[0].intent, confidence: matches.length === 1 ? 1 : 0.9, matched: matches[0].matched }
}

function compatibleWithIntent(qa: CanonicalGuestQA, intent: PrimaryIntent) {
	const definition = primaryIntents[intent]
	if (!definition.categories.includes(qa.category)) return false
	// Broad recommendation QAs are admitted only when their tags explicitly carry the intent.
	return qa.category !== "recommendations" || qa.tags.some((tag) => normalize(tag) === intent || (intent === "itinerary" && normalize(tag) === "area")) || definition.preferredIds.includes(qa.id)
}

export function normalize(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() }
const stem = (token: string) => token.length > 4 ? token.replace(/(ies|ing|ers|er|es|s)$/i, (ending) => ending === "ies" ? "y" : "") : token
function tokens(value: string) { const base = normalize(value).split(" ").filter((token) => token.length > 1 && !stop.has(token)); return [...new Set(base.flatMap((token) => [token, stem(token), ...(aliases[token] ?? [])]))] }
function trigrams(value: string) { const padded = `  ${normalize(value)} `; return new Set(Array.from({ length: Math.max(0, padded.length - 2) }, (_, index) => padded.slice(index, index + 3))) }
function fuzzy(a: string, b: string) { const one = trigrams(a); const two = trigrams(b); if (!one.size || !two.size) return 0; let overlap = 0; for (const part of one) if (two.has(part)) overlap++; return (2 * overlap) / (one.size + two.size) }
function requestedCategories(query: string) { return Object.entries(categoryAliases).flatMap(([alias, categories]) => query.includes(alias) ? categories : []) }

export function detectKnowledgeLanguage(question: string): ConciergeLanguage | undefined {
	const current = normalize(question)
	for (const qa of qas) for (const language of ["en", "it", "es", "fr", "de"] as ConciergeLanguage[]) {
		const localized = qa.localizations[language]
		if ([localized.question, ...localized.alternativeQuestions].some((candidate) => normalize(candidate) === current)) return language
	}
}

export function retrieveCanonicalQAs(question: string, language: ConciergeLanguage, history: ConversationTurn[] = [], limit = 4) {
	const recent = history.slice(-4).map((item) => item.content).join(" ")
	const context = question.split(/\s+/).length < 10 ? `${recent} ${question}` : question
	const query = normalize(context)
	const currentQuery = normalize(question)
	const queryTokens = tokens(context)
	const detection = detectPrimaryIntent(question)
	const isCuratedExact = qas.some((qa) => {
		const localized = qa.localizations[language]
		return localized && [localized.question, ...localized.alternativeQuestions].some((candidate) => normalize(candidate) === currentQuery)
	})
	const rank = (pool: CanonicalGuestQA[]) => pool.map((qa) => {
		const localized = qa.localizations[language]
		if (!localized) return { qa, localized: undefined, score: 0 }
		const questions = [localized.question, ...localized.alternativeQuestions]
		const searchable = normalize(`${localized.question} ${localized.alternativeQuestions.join(" ")} ${qa.tags.join(" ")} ${qa.locations.join(" ")}`)
		const localizedSearchable = normalize(questions.join(" "))
		const overlap = queryTokens.reduce((score, token) => score + (localizedSearchable.includes(token) ? 8 : searchable.includes(token) ? (qa.tags.some((tag) => normalize(tag).includes(token)) ? 5 : 3) : 0), 0)
		const phrase = questions.reduce((score, candidate) => Math.max(score, fuzzy(query, normalize(candidate)) * 20), 0)
		// Exact normalized wording is a legitimate high-confidence signal for curated natural
		// variants. It is deliberately independent of QA ids and canonical-answer content.
		const curatedWording = questions.some((candidate) => normalize(candidate) === normalize(question) || normalize(candidate) === query) ? 100 : 0
		const currentTokens = tokens(question)
		const currentOverlap = currentTokens.reduce((score, token) => score + (localizedSearchable.includes(token) ? (token.length >= 5 ? 22 : 12) : 0), 0)
		const location = qa.locations.some((location) => query.includes(normalize(location).split(" ")[0])) ? 5 : 0
		const intentPreference = detection.intent && primaryIntents[detection.intent].preferredIds.includes(qa.id) ? 18 : 0
		return { qa, localized, score: overlap + phrase + curatedWording + currentOverlap + location + intentPreference + fuzzy(currentQuery, localized.question) * 8, primaryIntent: detection.intent }
	}).filter((result): result is { qa: CanonicalGuestQA; localized: NonNullable<typeof result.localized>; score: number; primaryIntent: PrimaryIntent | undefined } => Boolean(result.localized) && result.score >= 6).sort((a, b) => b.score - a.score || a.qa.id.localeCompare(b.qa.id))
	if (detection.intent && !isCuratedExact) {
		const compatible = rank(qas.filter((qa) => compatibleWithIntent(qa, detection.intent!)))
		if (compatible.length) return compatible.slice(0, limit)
	}
	// Controlled fallback: the global pool is considered only when no intent-compatible QA
	// reaches the normal relevance threshold. This prevents amenities from winning explicit
	// breakfast, dining, coffee and parking requests.
	return rank(qas).slice(0, limit)
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
