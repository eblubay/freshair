import type { LocalGuideDiningCategory } from "@/lib/local-place-categories"
import type { LocalGuideCandidates, LocalGuidePlace } from "@/lib/local-guide-places"

export type RankableCuratedPoi = {
	name: string
	category: string
	area: string
	description: string
	lat: number
	lng: number
	tag?: string
}

export type RankedLocalGuidePlace = Omit<LocalGuidePlace, "tag"> & { tag?: string }

const ORIGIN = { lat: 33.9031, lng: -118.4202 }
const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function distanceKm(poi: Pick<RankableCuratedPoi, "lat" | "lng">) {
	const radians = (degrees: number) => degrees * Math.PI / 180
	const dLat = radians(poi.lat - ORIGIN.lat); const dLon = radians(poi.lng - ORIGIN.lng)
	const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(ORIGIN.lat)) * Math.cos(radians(poi.lat)) * Math.sin(dLon / 2) ** 2
	return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

const tier = (poi: RankedLocalGuidePlace) => poi.curated && poi.distanceKm <= 1.5 ? 1 : !poi.curated && poi.distanceKm <= 1.5 ? 2 : poi.curated && poi.area === "Manhattan Beach" ? 3 : !poi.curated && /Manhattan Beach/.test(poi.area) ? 4 : 5

export function rankLocalGuideDiningPlaces(category: LocalGuideDiningCategory, candidates: LocalGuideCandidates, curatedPois: readonly RankableCuratedPoi[], limit = 16) {
	const curated: RankedLocalGuidePlace[] = curatedPois.filter((poi) => poi.category === category).map((poi) => ({ ...poi, id: `curated-${slug(poi.name)}`, category, distanceKm: distanceKm(poi), curated: true })).filter((poi) => poi.distanceKm <= 5)
	const ranked = [...curated, ...candidates[category]].sort((a, b) => tier(a) - tier(b) || a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
	const unique = new Map<string, RankedLocalGuidePlace>()
	for (const poi of ranked) { const key = slug(poi.name); if (!unique.has(key)) unique.set(key, poi) }
	return [...unique.values()].slice(0, limit)
}

