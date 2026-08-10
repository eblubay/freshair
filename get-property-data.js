import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { pgTable, text, json, integer, timestamp, index } from "drizzle-orm/pg-core"
import { writeFileSync } from "fs"

const properties = pgTable(
	"properties",
	{
		id: text("id").primaryKey(),
		clerkId: text("clerk_id").notNull(),
		url: text("url").notNull(),
		listingData: json("listing_data"),
		views: integer("views").notNull().default(0),
		inquiries: integer("inquiries").notNull().default(0),
		pricePerNight: integer("price_per_night").notNull().default(0),
		createdAt: timestamp("created_at").notNull().defaultNow()
	},
	(table) => {
		return {
			clerkIdIdx: index("clerk_id_idx").on(table.clerkId)
		}
	}
)

const DATABASE_URL = "postgresql://postgres.hlcrpdcabbkjzlqfzduq:fUYL0DsKPGHwll9d@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

async function getPropertyData() {
	const client = postgres(DATABASE_URL)
	const db = drizzle(client)
	
	try {
		const allProperties = await db.select().from(properties)
		
		console.log(`Found ${allProperties.length} properties`)
		
		if (allProperties.length > 0) {
			const property = allProperties[0]
			console.log(`\nProperty ID: ${property.id}`)
			console.log(`URL: ${property.url}`)
			
			if (property.listingData) {
				const data = property.listingData
				console.log(`\nListing Data:`)
				console.log(`- Title: ${data.title || 'N/A'}`)
				console.log(`- Photos: ${data.photos?.length || 0}`)
				console.log(`- Description: ${data.description ? 'Yes' : 'No'}`)
				console.log(`- Amenities: ${data.amenities?.length || 0}`)
				console.log(`- Reviews: ${data.reviews?.length || 0}`)
				console.log(`- Rating: ${data.rating || 'N/A'}`)
				console.log(`- Host: ${data.host?.name || 'N/A'}`)
				
				// Save to file for inspection
				writeFileSync('./property-data.json', JSON.stringify(property, null, 2))
				console.log(`\n✅ Data saved to property-data.json`)
			}
		}
		
		await client.end()
	} catch (error) {
		console.error("Error:", error)
		await client.end()
		process.exit(1)
	}
}

getPropertyData()
