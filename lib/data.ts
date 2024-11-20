import listingData from "@/data/dump.json"
import type { Listing } from "@/data/types"

export function getListing(): Listing {
	const listing = listingData[0] as Listing
	for (const room of listing.data.gallery.rooms) {
		for (const image of room.images) {
			image.orientation = image.orientation.toUpperCase() as
				| "LANDSCAPE"
				| "PORTRAIT"
		}
	}
	return listing
}
