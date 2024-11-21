import type { Listing } from "@/data/types"
import { properties } from "@/db/schema"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"

export async function getListing(id: string): Promise<Listing> {
	const property = await db
		.select({
			listingData: properties.listingData
		})
		.from(properties)
		.where(eq(properties.id, id))
		.limit(1)
		.then((rows) => rows[0])
	if (!property) {
		throw new Error(`No property found for id: ${id}`)
	}

	const listing = property.listingData as Listing
	for (const room of listing.data.gallery.rooms) {
		for (const image of room.images) {
			image.orientation = image.orientation.toUpperCase() as
				| "LANDSCAPE"
				| "PORTRAIT"
		}
	}
	return listing
}
