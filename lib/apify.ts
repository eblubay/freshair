import "server-only"

import type { Listing } from "@/data/types"
import { properties, scrapingJobs } from "@/db/schema"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { ApifyClient } from "apify-client"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"

const ACTOR_ID = "tri_angle/airbnb-rooms-urls-scraper"

if (!process.env.APIFY_API_TOKEN) {
	throw new Error("APIFY_API_TOKEN is not set")
}

if (!process.env.VERCEL_URL) {
	throw new Error("VERCEL_URL is not set")
}

if (!process.env.WEBHOOK_SECRET) {
	throw new Error("WEBHOOK_SECRET is not set")
}

const WEBHOOK_URL = `https://${process.env.VERCEL_URL}/api/apify-webhook?secret=${process.env.WEBHOOK_SECRET}`

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN })
const listingActor = await client.actor(ACTOR_ID)

export const ApifyWebhookPayloadSchema = z.object({
	userId: z.string(),
	createdAt: z.string().datetime(),
	eventType: z.enum(["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"]),
	eventData: z.object({
		actorId: z.string(),
		actorRunId: z.string()
	}),
	resource: z
		.object({
			id: z.string()
		})
		.passthrough()
})

export type ApifyWebhookPayload = z.infer<typeof ApifyWebhookPayloadSchema>

export async function queueScraping(url: string, propertyId: string) {
	logger.info("Starting scraping job", { url, propertyId })
	const id = nanoid()

	const input = {
		startUrls: [{ url }]
	}

	const isDevelopment = process.env.NODE_ENV === "development" || process.env.VERCEL_URL === "localhost:3000"

	try {
		const run = await listingActor.start(input, {
			webhooks: isDevelopment ? [] : [
				{
					eventTypes: ["ACTOR.RUN.SUCCEEDED"],
					requestUrl: WEBHOOK_URL,
					idempotencyKey: id
				}
			]
		})

		logger.info("Apify actor started successfully", {
			runId: run.id,
			propertyId,
			url,
			mode: isDevelopment ? "development (polling)" : "production (webhook)"
		})

		await db.insert(scrapingJobs).values({
			id,
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

		// In development, poll for results since webhook won't work on localhost
		if (isDevelopment) {
			logger.info("Development mode: starting background polling for results", { runId: run.id })
			// Completely detached - no await, void to ignore Promise
			void pollForResults(run.id, propertyId).catch((error) => {
				logger.error("Background polling failed", { error, runId: run.id })
			})
		}
		
		// Return immediately - don't wait for polling
		return
	} catch (error) {
		logger.error("Failed to queue scraping job", {
			error,
			url,
			propertyId
		})
		throw error
	}
}

async function pollForResults(runId: string, propertyId: string) {
	const maxAttempts = 60 // 5 minutes max (5 second intervals)
	let attempts = 0

	while (attempts < maxAttempts) {
		attempts++
		await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

		try {
			const runs = await listingActor.runs()
			const list = await runs.list()
			const run = list.items.find((r) => r.id === runId)

			if (!run) {
				logger.warn("Run not found in list", { runId, attempt: attempts })
				continue
			}

			logger.info("Polling run status", {
				runId,
				status: run.status,
				attempt: attempts
			})

			if (run.status === "SUCCEEDED") {
				logger.info("Run succeeded, fetching results", { runId })
				await fetchAndStoreResults(runId)
				
				// Update job status
				await db
					.update(scrapingJobs)
					.set({
						status: "complete",
						completedAt: new Date()
					})
					.where(eq(scrapingJobs.runId, runId))
				
				logger.info("Development polling completed successfully", { runId, propertyId })
				return
			}

			if (run.status === "FAILED" || run.status === "ABORTED" || run.status === "TIMED-OUT") {
				logger.error("Run failed", { runId, status: run.status })
				
				await db
					.update(scrapingJobs)
					.set({
						status: "failed",
						completedAt: new Date(),
						error: `Run ${run.status.toLowerCase()}`
					})
					.where(eq(scrapingJobs.runId, runId))
				
				return
			}
		} catch (error) {
			logger.error("Error during polling", { error, runId, attempt: attempts })
		}
	}

	logger.error("Polling timeout - max attempts reached", { runId, maxAttempts })
	await db
		.update(scrapingJobs)
		.set({
			status: "failed",
			completedAt: new Date(),
			error: "Polling timeout"
		})
		.where(eq(scrapingJobs.runId, runId))
}

export async function fetchAndStoreResults(runId: string) {
	logger.info("Fetching scraping results", { runId })

	try {
		const job = await db
			.select()
			.from(scrapingJobs)
			.where(eq(scrapingJobs.runId, runId))
			.limit(1)
			.then((jobs) => jobs[0])
		if (!job) {
			throw new Error("Job not found")
		}

		const runs = await listingActor.runs()
		const list = await runs.list()
		const run = list.items.find((r) => r.id === runId)
		const datasetId = run?.defaultDatasetId
		if (!datasetId) {
			throw new Error("Dataset ID not found")
		}

		const { items } = await client.dataset(datasetId).listItems()
		logger.info("Retrieved dataset from Apify", {
			itemCount: items.length,
			datasetId
		})

		const listingData = items[0]

		await db
			.update(properties)
			.set({ listingData: listingData as unknown as Listing })
			.where(eq(properties.id, job.propertyId))

		logger.info("Updated property with scraped data", {
			propertyId: job.propertyId,
			runId
		})
	} catch (error) {
		logger.error("Failed to fetch and store results", {
			error,
			runId
		})
		throw error
	}
}
