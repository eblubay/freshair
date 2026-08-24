import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const output = path.join(root, "knowledge/local-places.json")
const importedAt = new Date().toISOString()
const endpoint = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter"
const bounds = "33.72,-118.78,34.12,-118.30"
const useful = [
	'[amenity~"restaurant|cafe|bar|pub|fast_food|ice_cream|pharmacy|hospital|clinic|doctors|parking|fuel|charging_station|bicycle_rental|atm|bank|post_office|toilets|marketplace"]',
	'[shop~"supermarket|convenience|bakery|seafood|greengrocer|mall|department_store|sports|bicycle|surf|chemist"]',
	'[tourism~"attraction|museum|viewpoint"]',
	'[leisure~"park|playground|sports_centre|fitness_centre|pitch|marina"]',
	'[natural~"beach"]',
	'[public_transport~"station|stop_position|platform"]'
]
const query = `[out:json][timeout:180];(${useful.map((filter) => `nwr${filter}(${bounds});`).join("")});out center tags;`

const categoryMap = {
	restaurant: "restaurant", cafe: "cafe", bar: "bar", pub: "pub", fast_food: "fast_food", ice_cream: "ice_cream",
	pharmacy: "pharmacy", hospital: "hospital", clinic: "clinic", doctors: "urgent_care", parking: "parking", fuel: "fuel",
	charging_station: "ev_charging", bicycle_rental: "bicycle_rental", atm: "atm", bank: "bank", post_office: "post_office",
	toilets: "restroom", marketplace: "shopping", supermarket: "supermarket", convenience: "convenience", bakery: "bakery",
	seafood: "shopping", greengrocer: "shopping", mall: "mall", department_store: "shopping", sports: "sports", bicycle: "bicycle_shop",
	surf: "surf_shop", chemist: "pharmacy", attraction: "attraction", museum: "museum", viewpoint: "viewpoint", park: "park",
	playground: "playground", sports_centre: "sports", fitness_centre: "gym", pitch: "sports", marina: "marina", beach: "beach",
	station: "public_transport", stop_position: "public_transport", platform: "public_transport"
}
const allowedTags = new Set(["name", "amenity", "shop", "tourism", "leisure", "natural", "public_transport", "addr:housenumber", "addr:street", "addr:city", "addr:postcode", "website", "contact:website", "phone", "contact:phone", "opening_hours", "cuisine", "takeaway", "outdoor_seating", "wheelchair", "operator", "brand"])

function classify(tags) {
	for (const key of ["amenity", "shop", "tourism", "leisure", "natural", "public_transport"]) if (tags[key] && categoryMap[tags[key]]) return [categoryMap[tags[key]], tags[key]]
}
function clean(value) { return typeof value === "string" && value.trim() ? value.trim() : undefined }
function normalize(element) {
	const tags = element.tags || {}; const classification = classify(tags); const latitude = element.lat ?? element.center?.lat; const longitude = element.lon ?? element.center?.lon
	if (!classification || !clean(tags.name) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
	const address = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || undefined
	return {
		id: `osm-${element.type}-${element.id}`, source: "openstreetmap", source_id: `${element.type}/${element.id}`, name: tags.name.trim(),
		category: classification[0], subcategory: classification[1], latitude, longitude, address, city: clean(tags["addr:city"]), postcode: clean(tags["addr:postcode"]),
		website: clean(tags.website || tags["contact:website"]), phone: clean(tags.phone || tags["contact:phone"]), opening_hours: clean(tags.opening_hours),
		cuisine: clean(tags.cuisine), takeaway: clean(tags.takeaway), outdoor_seating: clean(tags.outdoor_seating), wheelchair: clean(tags.wheelchair), operator: clean(tags.operator),
		tags: Object.fromEntries(Object.entries(tags).filter(([key, value]) => allowedTags.has(key) && typeof value === "string")), last_imported_at: importedAt, curated: false
	}
}

async function main() {
	const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "ShellByTheShore-local-knowledge/1.0" }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(210_000) })
	if (!response.ok) throw new Error(`OpenStreetMap import failed: HTTP ${response.status}`)
	const payload = await response.json(); const places = payload.elements.map(normalize).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id))
	const ids = new Set(); for (const place of places) { if (ids.has(place.id)) throw new Error(`Duplicate place ${place.id}`); ids.add(place.id) }
	if (places.length < 500) throw new Error(`Import returned only ${places.length} named useful places`)
	await writeFile(output, `${JSON.stringify({ version: 1, source: "OpenStreetMap contributors", license: "ODbL 1.0", attribution: "© OpenStreetMap contributors", bounds, importedAt, places }, null, 2)}\n`)
	console.log(`Imported ${places.length} named local places from OpenStreetMap (${bounds})`)
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
