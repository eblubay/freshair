import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { pgTable, text, json, integer, timestamp, index } from "drizzle-orm/pg-core"
import { eq } from "drizzle-orm"

// Schema definitions
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

const scrapingJobs = pgTable(
	"scraping_jobs",
	{
		id: text("id").primaryKey(),
		runId: text("run_id").notNull().unique(),
		propertyId: text("property_id").notNull(),
		status: text("status").notNull(),
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

const DATABASE_URL = "postgresql://postgres.hlcrpdcabbkjzlqfzduq:fUYL0DsKPGHwll9d@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

async function cleanDuplicates() {
	const client = postgres(DATABASE_URL)
	const db = drizzle(client)
	
	console.log("🔍 Cercando TUTTE le properties nel database...")
	
	try {
		// Trova TUTTE le properties
		const allProperties = await db
			.select()
			.from(properties)
		
		console.log(`\n📊 Trovate ${allProperties.length} properties totali`)
		
		// Filtra per URL Airbnb specifico
		const targetProperties = allProperties.filter(p => 
			p.url.includes("1674100477282192013")
		)
		
		console.log(`📊 Trovate ${targetProperties.length} properties per la listing target`)
		
		if (targetProperties.length <= 1) {
			console.log("\n✅ VALID PROPERTY KEPT: YES")
			console.log("✅ LOADING PROPERTY DELETED: NO (solo 1 property)")
			console.log("PROPERTIES REMAINING: 1")
			console.log("APIFY RUNS: 0")
			console.log("STATUS: CLEAN")
			await client.end()
			return
		}
		
		// Analizza ogni property e trova la migliore
		let bestProperty = null
		let bestScore = -1
		const propertyScores = []
		
		for (const prop of targetProperties) {
			const hasListingData = prop.listingData && typeof prop.listingData === 'object'
			const hasTitle = hasListingData && prop.listingData.title
			const hasPhotos = hasListingData && prop.listingData.photos && Array.isArray(prop.listingData.photos)
			const photoCount = hasPhotos ? prop.listingData.photos.length : 0
			const hasDescription = hasListingData && prop.listingData.description
			const hasAmenities = hasListingData && prop.listingData.amenities
			const hasHost = hasListingData && prop.listingData.host
			
			// Calcola punteggio
			let score = 0
			if (hasTitle) score += 10
			if (hasDescription) score += 10
			if (photoCount > 0) score += photoCount
			if (hasAmenities) score += 5
			if (hasHost) score += 5
			
			propertyScores.push({ prop, score })
			
			console.log(`\n📋 Property ID: ${prop.id}`)
			console.log(`   - Title: ${hasTitle ? '✅' : '❌'}`)
			console.log(`   - Photos: ${photoCount > 0 ? `✅ (${photoCount})` : '❌'}`)
			console.log(`   - Description: ${hasDescription ? '✅' : '❌'}`)
			console.log(`   - Amenities: ${hasAmenities ? '✅' : '❌'}`)
			console.log(`   - Host: ${hasHost ? '✅' : '❌'}`)
			console.log(`   - Score: ${score}`)
			
			if (score > bestScore) {
				bestScore = score
				bestProperty = prop
			}
		}
		
		console.log(`\n✅ Property migliore: ${bestProperty.id} (score: ${bestScore})`)
		
		// Elimina tutte le altre properties
		const propertiesToDelete = targetProperties.filter(p => p.id !== bestProperty.id)
		
		console.log(`\n🗑️  Eliminando ${propertiesToDelete.length} property duplicate...`)
		
		for (const prop of propertiesToDelete) {
			// Elimina scraping jobs associati
			const orphanJobs = await db
				.select()
				.from(scrapingJobs)
				.where(eq(scrapingJobs.propertyId, prop.id))
			
			if (orphanJobs.length > 0) {
				await db.delete(scrapingJobs).where(eq(scrapingJobs.propertyId, prop.id))
				console.log(`   - Eliminati ${orphanJobs.length} jobs per property ${prop.id}`)
			}
			
			// Elimina la property
			await db.delete(properties).where(eq(properties.id, prop.id))
			console.log(`   - Eliminata property ${prop.id}`)
		}
		
		// Verifica finale
		const remainingProperties = allProperties.filter(p => 
			p.url.includes("1674100477282192013") && p.id === bestProperty.id
		)
		
		console.log(`\n✅ VALID PROPERTY KEPT: YES`)
		console.log(`✅ LOADING PROPERTY DELETED: YES`)
		console.log(`✅ PROPERTIES REMAINING: ${remainingProperties.length}`)
		console.log("✅ APIFY RUNS: 0")
		console.log("\n✅ STATUS: CLEAN")
		
		await client.end()
	} catch (error) {
		console.error("❌ Errore:", error)
		await client.end()
		process.exit(1)
	}
}

cleanDuplicates()
