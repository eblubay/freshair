import { placeMatchesGuideDiningCategory, type LocalGuideDiningCategory } from "@/lib/local-place-categories"
import { allLocalPlaces, haversineKm } from "@/lib/local-places"
import type { LocalPlace } from "@/lib/local-places-types"

export const EL_PORTO_AREA_ORIGIN = { latitude: 33.9031, longitude: -118.4202 } as const
export const LOCAL_GUIDE_RESULT_LIMIT = 16
export const LOCAL_GUIDE_CANDIDATE_LIMIT = 24
export const LOCAL_GUIDE_MAX_DISTANCE_KM = 5

export type LocalGuidePlace = {
	id: string
	name: string
	category: LocalGuideDiningCategory
	area: string
	description: string
	lat: number
	lng: number
	distanceKm: number
	curated: boolean
	tag?: "ShellByTheShore Pick"
}

export type LocalGuideCandidates = Record<LocalGuideDiningCategory, LocalGuidePlace[]>

const DINING_CATEGORIES: LocalGuideDiningCategory[] = ["Food", "Coffee", "Breakfast"]

function isValidPlace(place: LocalPlace) {
	return place.name.trim().length >= 3
		&& Number.isFinite(place.latitude)
		&& Number.isFinite(place.longitude)
		&& Math.abs(place.latitude) <= 90
		&& Math.abs(place.longitude) <= 180
}

function publicArea(place: LocalPlace, distanceKm: number) {
	if (distanceKm <= 1.5) return "El Porto / North Manhattan Beach"
	if (/manhattan beach/i.test(place.city ?? "") || place.latitude < 33.9065) return "Manhattan Beach"
	if (/el segundo/i.test(place.city ?? "") || place.latitude >= 33.9065) return "El Segundo"
	return "South Bay"
}

function description(category: LocalGuideDiningCategory, area: string) {
	if (category === "Coffee") return `Coffee option in ${area}.`
	if (category === "Breakfast") return `Breakfast-relevant option in ${area}.`
	return `Food option in ${area}.`
}

export function getLocalGuideCandidates(): LocalGuideCandidates {
	const valid = allLocalPlaces().filter(isValidPlace).map((place) => ({ place, distanceKm: haversineKm(EL_PORTO_AREA_ORIGIN, place) }))
	const entries = DINING_CATEGORIES.map((category) => {
		const places = valid
			.filter(({ place, distanceKm }) => distanceKm <= LOCAL_GUIDE_MAX_DISTANCE_KM && placeMatchesGuideDiningCategory(place, category))
			.sort((a, b) => a.distanceKm - b.distanceKm || a.place.name.localeCompare(b.place.name))
			.slice(0, LOCAL_GUIDE_CANDIDATE_LIMIT)
			.map(({ place, distanceKm }) => {
				const area = publicArea(place, distanceKm)
				return { id: place.id, name: place.name, category, area, description: description(category, area), lat: place.latitude, lng: place.longitude, distanceKm, curated: false }
			})
		return [category, places]
	})
	return Object.fromEntries(entries) as LocalGuideCandidates
}
