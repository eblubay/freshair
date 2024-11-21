"use server"

import { type NewProperty, properties } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq, sql } from "drizzle-orm"
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
} & (
	| { status: "pending" }
	| {
			status: "loaded"
			title: string
			location: string
			views: number
			bookings: number
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
			>`NULLIF((${properties.listingData}::json->'data'-->'h1Title')::text, '')`,
			location: sql<
				string | null
			>`NULLIF((${properties.listingData}::json->'data'->'overview'->>'location')::text, '')`,
			views: sql<number>`0`,
			bookings: sql<number>`0`,
			hasListingData: sql<boolean>`${properties.listingData} IS NOT NULL`
		})
		.from(properties)
		.where(eq(properties.clerkId, userId))

	return results.map((result) => {
		if (!result.hasListingData) {
			return {
				id: result.id,
				url: result.url,
				status: "pending" as const
			}
		}

		return {
			status: "loaded" as const,
			id: result.id,
			url: result.url,
			title: result.title ?? "",
			location: result.location ?? "",
			views: result.views ?? 0,
			bookings: result.bookings ?? 0
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
