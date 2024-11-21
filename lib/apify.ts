import "server-only"

const ACTOR_ID = "PD6Eb2AlmsXqGxffs"

if (!process.env.APIFY_API_TOKEN) {
	throw new Error("APIFY_API_TOKEN is not set")
}

import { ApifyClient } from "apify-client"
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN })
const listingActor = await client.actor(ACTOR_ID)

import type { Listing } from "@/data/types"
import { properties, scrapingJobs } from "@/db/schema"
import { db } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"

if (!process.env.NEXT_PUBLIC_APP_URL) {
	throw new Error("NEXT_PUBLIC_APP_URL is not set")
}

if (!process.env.WEBHOOK_SECRET) {
	throw new Error("WEBHOOK_SECRET is not set")
}

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/apify-webhook?secret=${process.env.WEBHOOK_SECRET}`

export async function queueScraping(url: string, propertyId: string) {
	const input = {
		startUrls: [{ url }]
	}

	// Start the actor run
	const run = await listingActor.start(input, {
		webhooks: [
			{
				eventTypes: ["ACTOR.RUN.SUCCEEDED"],
				requestUrl: WEBHOOK_URL,
				payloadTemplate: JSON.stringify({
					propertyId,
					runId: "{{eventData.actorRunId}}",
					success: true,
					datasetId: "{{eventData.defaultDatasetId}}"
				}),
				idempotencyKey: propertyId
			}
		]
	})

	await db.insert(scrapingJobs).values({
		id: nanoid(),
		propertyId,
		runId: run.id,
		status: "pending",
		url,
		startedAt: new Date()
	})
}

export async function fetchAndStoreResults(
	runId: string,
	datasetId: string,
	propertyId: string
) {
	// Get the dataset items
	const { items } = await client.dataset(datasetId).listItems()
	const listingData = items[0] // Assuming we only scrape one listing

	// Update the property with the scraped data
	await db
		.update(properties)
		.set({ listingData: listingData as unknown as Listing })
		.where(and(eq(properties.id, propertyId), eq(scrapingJobs.runId, runId)))
}
