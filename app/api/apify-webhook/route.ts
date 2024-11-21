import { scrapingJobs } from "@/db/schema"
import { fetchAndStoreResults } from "@/lib/apify"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	logger.info("Received webhook request", {
		headers: Object.fromEntries(request.headers),
		url: request.url
	})

	// Verify the secret token
	const url = new URL(request.url)
	const secret = url.searchParams.get("secret")

	if (secret !== process.env.WEBHOOK_SECRET) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		const payload = await request.json()
		logger.info("Webhook payload received", { payload })
		const { propertyId, runId, success, datasetId } = payload

		if (success && datasetId) {
			await fetchAndStoreResults(runId, datasetId, propertyId)
		}

		await db
			.update(scrapingJobs)
			.set({
				status: success ? "complete" : "failed",
				completedAt: new Date()
			})
			.where(
				and(
					eq(scrapingJobs.propertyId, propertyId),
					eq(scrapingJobs.runId, runId)
				)
			)

		return NextResponse.json({ success: true })
	} catch (error) {
		logger.error("Error processing webhook", { error })
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		)
	}
}
