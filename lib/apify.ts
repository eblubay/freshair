import "server-only"

import type { Listing } from "@/data/types"
import { properties, scrapingJobs } from "@/db/schema"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { ApifyClient } from "apify-client"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

const ACTOR_ID = "PD6Eb2AlmsXqGxffs"

if (!process.env.APIFY_API_TOKEN) {
	throw new Error("APIFY_API_TOKEN is not set")
}

if (!process.env.VERCEL_URL) {
	throw new Error("VERCEL_URL is not set")
}

if (!process.env.WEBHOOK_SECRET) {
	throw new Error("WEBHOOK_SECRET is not set")
}

const WEBHOOK_URL = `${process.env.VERCEL_URL}/api/apify-webhook?secret=${process.env.WEBHOOK_SECRET}`

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN })
const listingActor = await client.actor(ACTOR_ID)

export async function queueScraping(url: string, propertyId: string) {
	logger.info("Starting scraping job", { url, propertyId })

	const input = {
		startUrls: [{ url }]
	}

	try {
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

		logger.info("Apify actor started successfully", {
			runId: run.id,
			propertyId,
			url
		})

		await db.insert(scrapingJobs).values({
			id: nanoid(),
			propertyId,
			runId: run.id,
			status: "pending",
			url,
			startedAt: new Date()
		})

		logger.info("Scraping job recorded in database", {
			runId: run.id,
			propertyId
		})
	} catch (error) {
		logger.error("Failed to queue scraping job", {
			error,
			url,
			propertyId
		})
		throw error
	}
}

export async function fetchAndStoreResults(
	runId: string,
	datasetId: string,
	propertyId: string
) {
	logger.info("Fetching scraping results", { runId, datasetId, propertyId })

	try {
		const { items } = await client.dataset(datasetId).listItems()
		logger.info("Retrieved dataset from Apify", {
			itemCount: items.length,
			datasetId
		})

		const listingData = items[0]

		await db
			.update(properties)
			.set({ listingData: listingData as unknown as Listing })
			.where(eq(properties.id, propertyId))

		logger.info("Updated property with scraped data", {
			propertyId,
			runId
		})
	} catch (error) {
		logger.error("Failed to fetch and store results", {
			error,
			runId,
			datasetId,
			propertyId
		})
		throw error
	}
}
