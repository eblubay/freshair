import type { LocalPlace } from "@/lib/local-places-types"

export type LocalGuideDiningCategory = "Food" | "Coffee" | "Breakfast"

const CATEGORY_FAMILIES: Record<string, readonly string[]> = {
	restaurant: ["restaurant", "fast_food", "food_court"],
	food: ["restaurant", "fast_food", "food_court"],
	cafe: ["cafe", "coffee", "coffee_shop"],
	coffee: ["cafe", "coffee", "coffee_shop"],
	breakfast: ["breakfast", "brunch"],
	bakery: ["bakery"],
	supermarket: ["supermarket", "grocery", "groceries"],
	convenience: ["convenience"],
	pharmacy: ["pharmacy", "chemist"],
	clinic: ["clinic", "urgent_care", "doctors"],
	hospital: ["hospital"],
	parking: ["parking"],
	ev_charging: ["ev_charging", "charging_station"],
	fuel: ["fuel", "gas_station"],
	atm: ["atm"],
	bank: ["bank"],
	bar: ["bar", "pub", "biergarten"],
	beach: ["beach", "beaches"],
	park: ["park"],
	playground: ["playground"],
	attraction: ["attraction", "attractions", "museum", "park", "playground", "beach", "beaches"],
	museum: ["museum"],
	shopping: ["shopping", "mall"],
	bicycle_rental: ["bicycle_rental"],
	surf_shop: ["surf_shop"],
	restroom: ["restroom", "toilets"],
	post_office: ["post_office"]
}

const normalized = (value: string | undefined) => (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
type CategoryEvidence = Pick<LocalPlace, "category"> & Partial<Pick<LocalPlace, "name" | "subcategory" | "cuisine" | "tags">>

const evidenceTokens = (place: CategoryEvidence) =>
	new Set(`${place.category} ${place.subcategory ?? ""} ${place.cuisine ?? ""} ${Object.values(place.tags ?? {}).join(" ")}`.toLowerCase().split(/[^a-z_]+/).filter(Boolean))

export function placeSupportsBreakfast(place: CategoryEvidence) {
	const evidence = evidenceTokens(place)
	return evidence.has("breakfast") || evidence.has("brunch")
}

export function placeIsCoffeeFocused(place: CategoryEvidence) {
	const venueCategory = normalized(place.category)
	const venueSubcategory = normalized(place.subcategory)
	if (![...CATEGORY_FAMILIES.coffee, "bakery"].includes(venueCategory) && ![...CATEGORY_FAMILIES.coffee, "bakery"].includes(venueSubcategory)) return false
	const evidence = evidenceTokens(place)
	if (evidence.has("coffee") || evidence.has("coffee_shop") || venueCategory === "coffee" || venueCategory === "coffee_shop") return true
	return /(?:^|\s)(coffee|espresso|roasters?)(?:\s|$)/i.test(place.name ?? "")
}

export function placeMatchesGuideDiningCategory(place: CategoryEvidence, category: LocalGuideDiningCategory) {
	if (category === "Breakfast") return placeSupportsBreakfast(place)
	if (category === "Coffee") return placeIsCoffeeFocused(place)
	return CATEGORY_FAMILIES.food.includes(normalized(place.category)) || CATEGORY_FAMILIES.food.includes(normalized(place.subcategory))
}

export function placeMatchesCategoryFamily(place: CategoryEvidence, requested: string[]) {
	return requested.some((category) => {
		const request = normalized(category)
		if (request === "breakfast") return placeSupportsBreakfast(place)
		if (request === "coffee") return placeIsCoffeeFocused(place)
		const actual = [normalized(place.category), normalized(place.subcategory)]
		return (CATEGORY_FAMILIES[request] ?? [request]).some((accepted) => actual.includes(accepted))
	})
}
