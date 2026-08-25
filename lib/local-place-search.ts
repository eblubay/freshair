import { allLocalPlaces, haversineKm, toMapDestination } from "@/lib/local-places"
import { normalize, publicKnowledge } from "@/lib/concierge-retrieval"
import type { ConciergeLanguage } from "@/lib/concierge-types"
import type { LocalPlace, MapDestination } from "@/lib/local-places-types"

export type PlaceIntent = {
	primaryIntent?: string
	categories: string[]
	area?: string
	proximity?: "nearby" | "beach" | "pier"
	audience?: "family" | "couples" | "teenagers"
	preferences: string[]
	transportMode?: "walking" | "cycling" | "driving" | "public_transport"
	directions: boolean
	entity?: string
}
export type PlaceSearchResult = { place: LocalPlace; score: number; distanceKm?: number; destination: MapDestination }

const areaCenters: Record<string, { latitude: number; longitude: number }> = {
	"el porto": { latitude: 33.9031, longitude: -118.4202 }, "manhattan beach": { latitude: 33.8844, longitude: -118.4114 },
	"hermosa beach": { latitude: 33.8621, longitude: -118.4008 }, "redondo beach": { latitude: 33.8367, longitude: -118.3914 },
	"el segundo": { latitude: 33.9192, longitude: -118.4165 }, "playa del rey": { latitude: 33.9578, longitude: -118.4488 },
	"marina del rey": { latitude: 33.9803, longitude: -118.4517 }, venice: { latitude: 33.985, longitude: -118.4695 },
	"santa monica": { latitude: 34.0099, longitude: -118.4962 }, malibu: { latitude: 34.0362, longitude: -118.6777 },
	lax: { latitude: 33.9416, longitude: -118.4085 }, "south bay": { latitude: 33.8844, longitude: -118.4114 }
}
const categoryTerms: Record<string, string[]> = {
	restaurant: ["restaurant", "ristorante", "restaurante", "essen", "dinner", "cena", "dîner", "abendessen", "lunch", "pranzo", "almuerzo", "déjeuner", "breakfast", "brunch", "colazione", "desayuno", "petit déjeuner", "frühstück"],
	cafe: ["coffee", "cafe", "caffè", "café", "kaffee", "espresso"], bakery: ["bakery", "panetteria", "panadería", "boulangerie", "bäckerei"],
	fast_food: ["quick meal", "fast food", "pasto veloce", "comida rápida", "repas rapide", "schnelles essen"], ice_cream: ["ice cream", "gelato", "helado", "glace", "eis"],
	supermarket: ["supermarket", "groceries", "grocery", "supermercato", "spesa", "supermercado", "supermarché", "supermarkt", "lebensmittel"], convenience: ["convenience", "water", "acqua", "agua", "wasser", "sunscreen", "crema solare"],
	pharmacy: ["pharmacy", "farmacia", "pharmacie", "apotheke"], clinic: ["urgent care", "clinic", "clinica", "clínica", "clinique", "klinik"], hospital: ["hospital", "ospedale", "hôpital", "krankenhaus"],
	parking: ["parking", "parcheggio", "aparcamiento", "aparcar", "stationnement", "garer", "parken", "parkplatz"], ev_charging: ["ev charging", "carica elettrica", "carga eléctrica", "recharge électrique", "ladestation"], fuel: ["gas station", "fuel", "benzina", "gasolinera", "station-service", "tankstelle"],
	beach: ["beach", "spiaggia", "playa", "plage", "strand"], park: ["park", "parco", "parque", "parc"], playground: ["playground", "parco giochi", "parque infantil", "aire de jeux", "spielplatz"],
	attraction: ["attraction", "things to do", "cosa fare", "qué hacer", "que faire", "unternehmen"], museum: ["museum", "museo", "musée"],
	shopping: ["shopping", "shop", "negozi", "compras", "boutiques", "einkaufen"], bicycle_rental: ["bike rental", "bicycle rental", "noleggio bici", "alquiler de bicicletas", "location de vélos", "fahrradverleih"],
	surf_shop: ["surf rental", "surf shop", "tavola da surf", "tabla de surf", "planche de surf", "surfbrett"], restroom: ["restroom", "toilet", "bagno", "baño", "toilettes", "toilette"],
	atm: ["atm", "bancomat", "cajero", "distributeur", "geldautomat"], bank: ["bank", "banca", "banco", "banque"], post_office: ["post office", "posta", "correos", "poste", "postamt"]
}
const preferenceTerms = ["vegan", "vegetarian", "seafood", "sushi", "pizza", "burger", "mexican", "italian", "asian", "healthy", "cheap", "inexpensive", "upscale", "takeout", "outdoor", "wheelchair", "ocean view"]

export function extractPlaceIntent(question: string): PlaceIntent {
	const query = normalize(question); const containsTerm = (term: string) => new RegExp(`(?:^|\\s)${normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\s)`).test(query)
	const categories = Object.entries(categoryTerms).filter(([, terms]) => terms.some(containsTerm)).map(([category]) => category).filter((category) => category !== "beach" || !categoriesWithoutBeach(question).length)
	const area = Object.keys(areaCenters).sort((a, b) => b.length - a.length).find((name) => query.includes(name)) ?? (/\bhermosa\b/.test(query) ? "hermosa beach" : /\bredondo\b/.test(query) ? "redondo beach" : undefined)
	const directions = /\b(show|map|where is|directions?|get there|come ci arrivo|mostra|mappa|como llego|mapa|ou est|carte|wie komme|karte)\b/i.test(normalize(question))
	const audience = /\b(kids|children|family|bambini|famiglia|ninos|familia|enfants|famille|kinder|familie)\b/.test(query) ? "family" : /\b(couple|romantic|coppia|pareja|couple|paar)\b/.test(query) ? "couples" : /\b(teen|teenager|adolescent|ragazzi)\b/.test(query) ? "teenagers" : undefined
	const transportMode = /\b(walk|walking|piedi|cammin|andando|marche|zu fuss)\b/.test(query) ? "walking" : /\b(bike|bicycle|bici|velo|fahrrad)\b/.test(query) ? "cycling" : /\b(bus|public transport|trasporto pubblico|transporte publico|transport public|offentliche verkehr)\b/.test(query) ? "public_transport" : /\b(car|drive|auto|coche|voiture|fahren)\b/.test(query) ? "driving" : undefined
	return { primaryIntent: categories[0], categories, area, proximity: /\b(near (?:the )?beach|beachfront|vicino alla spiaggia|cerca de la playa|pres de la plage|strandnahe)\b/.test(query) ? "beach" : /\b(near|nearby|closest|close|vicino|cerca|proche|nahe|nachste)\b/.test(query) ? "nearby" : /\bpier\b/.test(query) ? "pier" : undefined, audience, preferences: preferenceTerms.filter((term) => query.includes(term)), transportMode, directions }
}

function categoriesWithoutBeach(question: string) { const query = normalize(question); return Object.entries(categoryTerms).filter(([category, terms]) => category !== "beach" && terms.some((term) => new RegExp(`(?:^|\\s)${normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\s)`).test(query))).map(([category]) => category) }

function curatedPlaces(): LocalPlace[] {
	return publicKnowledge().filter((record) => record.poi && !record.parentId).map((record) => ({ id: `curated-${record.poi!.id}`, source: "shellbytheshore", source_id: record.poi!.id, name: record.title, category: record.category, latitude: record.poi!.lat, longitude: record.poi!.lng, city: record.location, tags: Object.fromEntries(record.tags.map((tag) => [tag, "yes"])), last_imported_at: "curated", curated: true }))
}
const words = (value: string) => normalize(value).split(" ").filter((word) => word.length > 2)

export function searchPlaces(question: string, _language: ConciergeLanguage, limit = 5): { intent: PlaceIntent; results: PlaceSearchResult[] } {
	const intent = extractPlaceIntent(question); const query = normalize(question); const origin = intent.area ? areaCenters[intent.area] : areaCenters["el porto"]
	// Filter out corrupted entries (e.g. single-character names from malformed OSM imports)
	const pool = [...curatedPlaces(), ...allLocalPlaces()].filter((place) => place.name.trim().length >= 3)
	const results = pool.map((place) => {
		const searchable = normalize(`${place.name} ${place.category} ${place.subcategory || ""} ${place.city || ""} ${place.cuisine || ""} ${Object.values(place.tags).join(" ")}`)
		const exactName = query.includes(normalize(place.name)) ? 120 : 0
		const nameOverlap = words(place.name).reduce((score, word) => score + (query.includes(word) ? 12 : 0), 0)
		const category = intent.categories.includes(place.category) || (intent.categories.includes("restaurant") && ["fast_food", "pub"].includes(place.category)) ? 45 : 0
		const preference = intent.preferences.reduce((score, word) => score + (searchable.includes(word) ? 8 : -1), 0)
		const distanceKm = haversineKm(origin, place); const geographic = Math.max(0, 18 - distanceKm * (intent.proximity ? 5 : 1.2))
		const area = intent.area && normalize(place.city || "").includes(intent.area.split(" ")[0]) ? 24 : 0
		const curated = place.curated && (category || exactName || nameOverlap) ? 35 : 0
		return { place, score: exactName + nameOverlap + category + preference + geographic + area + curated, distanceKm, destination: toMapDestination(place) }
	}).filter((result) => result.score >= (intent.categories.length || intent.directions ? 24 : 70)).sort((a, b) => b.score - a.score || Number(b.place.curated) - Number(a.place.curated) || a.distanceKm - b.distanceKm || a.place.name.localeCompare(b.place.name))
	const unique = new Map<string, PlaceSearchResult>(); for (const result of results) { const key = normalize(result.place.name); if (!unique.has(key)) unique.set(key, result) }
	return { intent, results: [...unique.values()].slice(0, limit) }
}
