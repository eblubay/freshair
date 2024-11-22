"use server"

import type { Listing } from "@/data/types"
import { type NewProperty, properties } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { desc, eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import "server-only"
import { z } from "zod"
import { queueScraping } from "./apify"
import { db } from "./db"

// TODO: lock this down to only allow airbnb.com/rooms/ URLs
// Reuse the same URL validation schema
const urlSchema = z
	.string()
	.url()
	.includes("airbnb.com/rooms/")
	.regex(/airbnb\.com\/rooms\/\d+/, "Must be a valid Airbnb listing URL")

export async function createProperty(url: string) {
	// Validate the URL again on server-side
	const validatedUrl = urlSchema.parse(url)

	// Get the authenticated user
	const { userId } = await auth()
	if (!userId) throw new Error("Unauthorized")

	// Prepare the new property data
	const newProperty: NewProperty = {
		id: nanoid(),
		clerkId: userId,
		url: validatedUrl,
		listingData: null
	}

	// First insert into database
	await db.insert(properties).values(newProperty)

	// Then queue scraping
	await queueScraping(validatedUrl, newProperty.id)

	return { success: true }
}

export type VisualProperty = {
	id: string
	url: string
	pricePerNight: number
} & (
	| { status: "pending" }
	| {
			status: "loaded"
			title: string
			location: string
			views: number
			inquiries: number
	  }
)

export async function getProperties(): Promise<VisualProperty[]> {
	const { userId } = await auth()
	if (!userId) throw new Error("Unauthorized")

	const results = await db
		.select({
			id: properties.id,
			url: properties.url,
			title: sql<
				string | null
			>`(${properties.listingData}::json->'data'->>'h1Title')`,
			location: sql<
				string | null
			>`(${properties.listingData}::json->'data'->'overview'->>'location')`,
			views: properties.views,
			inquiries: properties.inquiries,
			hasListingData: sql<boolean>`${properties.listingData} IS NOT NULL`,
			pricePerNight: properties.pricePerNight
		})
		.from(properties)
		.where(eq(properties.clerkId, userId))
		.orderBy(desc(properties.createdAt))

	return results.map((result) => {
		if (!result.hasListingData) {
			return {
				id: result.id,
				url: result.url,
				pricePerNight: result.pricePerNight,
				status: "pending" as const
			}
		}

		return {
			status: "loaded" as const,
			id: result.id,
			url: result.url,
			title: result.title ?? "",
			location: result.location ?? "",
			views: result.views,
			inquiries: result.inquiries,
			pricePerNight: result.pricePerNight
		}
	})
}

export async function deleteProperty(propertyId: string) {
	const { userId } = await auth()
	if (!userId) throw new Error("Unauthorized")

	await db
		.delete(properties)
		.where(
			sql`${properties.id} = ${propertyId} AND ${properties.clerkId} = ${userId}`
		)

	return { success: true }
}

export type ExploreProperty = {
	id: string
	title: string
	location: string
	propertyType: string
	capacity: number
	rating: number | null
	pricePerNight: number
	amenityCount: number
	mainImage: string
	stats: {
		views: number
		inquiries: number
	}
}

export async function getExploreProperties(): Promise<ExploreProperty[]> {
	const results = await db
		.select({
			id: properties.id,
			title: sql<string>`(${properties.listingData}::json->'data'->>'h1Title')`,
			location: sql<string>`(${properties.listingData}::json->'data'->'overview'->>'location')`,
			propertyType: sql<string>`(${properties.listingData}::json->'data'->'overview'->>'propertyType')`,
			capacity: sql<number>`(${properties.listingData}::json->'data'->'overview'->>'capacity')`,
			rating: sql<number>`(${properties.listingData}::json->'data'->'overview'->>'rating')`,
			amenityCount: sql<number>`(${properties.listingData}::json->'data'->'amenities'->>'count')`,
			mainImage: sql<string>`(${properties.listingData}::json->'data'->'overview'->>'imageUrl')`,
			views: properties.views,
			inquiries: properties.inquiries,
			pricePerNight: properties.pricePerNight
		})
		.from(properties)
		.where(sql`${properties.listingData} IS NOT NULL`)
		.orderBy(desc(properties.createdAt))

	return results.map((result) => ({
		id: result.id,
		title: result.title ?? "Untitled Property",
		location: result.location ?? "Unknown Location",
		propertyType: result.propertyType ?? "Property",
		capacity: result.capacity ?? 1,
		rating: result.rating,
		amenityCount: result.amenityCount ?? 0,
		mainImage: result.mainImage,
		pricePerNight: result.pricePerNight,
		stats: {
			views: result.views,
			inquiries: result.inquiries
		}
	}))
}

export async function incrementPropertyViews(propertyId: string) {
	await db
		.update(properties)
		.set({
			views: sql`${properties.views} + 1`
		})
		.where(eq(properties.id, propertyId))
}

export async function incrementPropertyInquiries(propertyId: string) {
	await db
		.update(properties)
		.set({
			inquiries: sql`${properties.inquiries} + 1`
		})
		.where(eq(properties.id, propertyId))
}

export async function updatePropertyPrice(propertyId: string, price: number) {
	const { userId } = await auth()
	if (!userId) throw new Error("Unauthorized")

	await db
		.update(properties)
		.set({ pricePerNight: price })
		.where(
			sql`${properties.id} = ${propertyId} AND ${properties.clerkId} = ${userId}`
		)

	return { success: true }
}

export async function getPropertyPrice(propertyId: string): Promise<number> {
	const result = await db
		.select({ pricePerNight: properties.pricePerNight })
		.from(properties)
		.where(eq(properties.id, propertyId))
		.limit(1)

	return result[0]?.pricePerNight ?? 0
}

export type ListingWithPrice = {
	data: Listing["data"]
	pricePerNight: number
}

export async function getListing(id: string): Promise<ListingWithPrice | null> {
	const property = await db
		.select({
			listingData: properties.listingData,
			pricePerNight: properties.pricePerNight
		})
		.from(properties)
		.where(eq(properties.id, id))
		.limit(1)
		.then((rows) => rows[0])

	if (!property || !property.listingData) {
		return null
	}

	const listing = property.listingData as Listing
	for (const room of listing.data.gallery.rooms) {
		for (const image of room.images) {
			image.orientation = image.orientation.toUpperCase() as
				| "LANDSCAPE"
				| "PORTRAIT"
		}
	}

	return {
		data: listing.data,
		pricePerNight: property.pricePerNight
	}
}
