import type { Listing } from "@/data/types"
import { index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const properties = pgTable(
	"properties",
	{
		id: text("id").primaryKey(),
		clerkId: text("clerk_id").notNull(),
		url: text("url").notNull(),
		listingData: json("listing_data").$type<Listing>()
	},
	(table) => {
		return {
			clerkIdIdx: index("clerk_id_idx").on(table.clerkId)
		}
	}
)

export const scrapingJobs = pgTable(
	"scraping_jobs",
	{
		id: text("id").primaryKey(),
		runId: text("run_id").notNull().unique(),
		propertyId: text("property_id")
			.references(() => properties.id)
			.notNull(),
		status: text("status", {
			enum: ["pending", "complete", "failed"]
		}).notNull(),
		url: text("url").notNull(),
		startedAt: timestamp("started_at").notNull(),
		completedAt: timestamp("completed_at"),
		error: text("error")
	},
	(table) => ({
		propertyIdIdx: index("property_id_idx").on(table.propertyId),
		runIdIdx: index("run_id_idx").on(table.runId)
	})
)

// Types for type safety
export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert
export type ScrapingJob = typeof scrapingJobs.$inferSelect
export type NewScrapingJob = typeof scrapingJobs.$inferInsert
