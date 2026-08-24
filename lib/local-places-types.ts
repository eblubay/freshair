export type LocalPlaceSource = "openstreetmap" | "shellbytheshore"

export type LocalPlace = {
	id: string
	source: LocalPlaceSource
	source_id: string
	name: string
	category: string
	subcategory?: string
	latitude: number
	longitude: number
	address?: string
	city?: string
	postcode?: string
	website?: string
	phone?: string
	opening_hours?: string
	cuisine?: string
	takeaway?: string
	outdoor_seating?: string
	wheelchair?: string
	operator?: string
	tags: Record<string, string>
	last_imported_at: string
	curated: boolean
}

export type MapDestination = {
	id: string
	name: string
	category: string
	latitude: number
	longitude: number
	address?: string
	curated: boolean
}

export type ConciergeMapPayload = {
	active: boolean
	mode: "destinations"
	destinations: MapDestination[]
	selectedDestinationId?: string
	showGeneralOrigin: boolean
	attribution: string
}
