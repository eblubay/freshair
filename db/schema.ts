import type { Listing } from "@/data/types"
import { index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const properties = pgTable(
	"properties",
	{
		id: text("id").primaryKey(),
		clerkId: text("clerk_id").notNull(),
		url: text("url").notNull(),
		listingData: json("listing_data").$type<Listing>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => {
		return {
			clerkIdIdx: index("clerk_id_idx").on(table.clerkId)
		}
	}
)

// Types for type safety
export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert
