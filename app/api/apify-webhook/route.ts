import { scrapingJobs } from "@/db/schema"
import { ApifyWebhookPayloadSchema, fetchAndStoreResults } from "@/lib/apify"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { eq } from "drizzle-orm"
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
		const rawPayload = await request.json()
		logger.info("Webhook payload received", { payload: rawPayload })

		const payload = ApifyWebhookPayloadSchema.safeParse(rawPayload)
		if (!payload.success) {
			logger.error("Invalid webhook payload", { errors: payload.error })
			return NextResponse.json(
				{ error: "Invalid webhook payload" },
				{ status: 400 }
			)
		}

		const { runId, success } = payload.data

		if (success) {
			await fetchAndStoreResults(runId)
		}

		await db
			.update(scrapingJobs)
			.set({
				status: success ? "complete" : "failed",
				completedAt: new Date()
			})
			.where(eq(scrapingJobs.runId, runId))

		return NextResponse.json({ success: true })
	} catch (error) {
		logger.error("Error processing webhook", { error })
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		)
	}
}
