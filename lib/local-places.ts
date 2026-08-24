import localData from "@/knowledge/local-places.json"
import type { LocalPlace, MapDestination } from "@/lib/local-places-types"

const places = localData.places as LocalPlace[]
export const LOCAL_PLACES_ATTRIBUTION = "© OpenStreetMap contributors"

export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
	const radians = (degrees: number) => degrees * Math.PI / 180
	const dLat = radians(b.latitude - a.latitude); const dLon = radians(b.longitude - a.longitude)
	const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2
	return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function allLocalPlaces() { return places }
export function localPlaceById(id: string) { return places.find((place) => place.id === id) }
export function toMapDestination(place: LocalPlace): MapDestination {
	return { id: place.id, name: place.name, category: place.category, latitude: place.latitude, longitude: place.longitude, address: place.address, curated: place.curated }
}
