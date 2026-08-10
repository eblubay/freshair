import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { pgTable, text, json, integer, timestamp, index } from "drizzle-orm/pg-core"
import { eq } from "drizzle-orm"
import { readFileSync } from "fs"

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

async function transformPropertyData() {
	const client = postgres(DATABASE_URL)
	const db = drizzle(client)
	
	try {
		// Read current property data
		const propertyData = JSON.parse(readFileSync('./property-data.json', 'utf-8'))
		const apifyData = propertyData.listingData
		
		console.log('🔄 Transforming Apify data to Listing format...')
		
		// Transform to expected Listing structure
		const transformedListing = {
			metadata: {
				timestamp: apifyData.timestamp || new Date().toISOString(),
				url: apifyData.url || propertyData.url,
				listingId: apifyData.id || '',
				duration: 0
			},
			data: {
				h1Title: apifyData.title || '',
				overview: {
					title: apifyData.title || '',
					propertyType: apifyData.propertyType || 'Entire rental unit',
					location: 'Manhattan Beach, California',
					capacity: apifyData.personCapacity || 4,
					rating: apifyData.rating?.guestSatisfaction || null,
					reviewCount: apifyData.rating?.reviewsCount || 0,
					ratings: apifyData.rating ? {
						accuracy: apifyData.rating.accuracy || 0,
						checkin: apifyData.rating.checking || 0,
						cleanliness: apifyData.rating.cleanliness || 0,
						communication: apifyData.rating.communication || 0,
						location: apifyData.rating.location || 0,
						value: apifyData.rating.value || 0,
						overall: apifyData.rating.guestSatisfaction || 0
					} : null,
					isSuperhost: false,
					description: apifyData.metaDescription || null,
					imageUrl: apifyData.images?.[0]?.imageUrl || apifyData.thumbnail || null
				},
				amenities: {
					title: 'What this place offers',
					count: apifyData.amenities?.reduce((sum, group) => sum + (group.values?.length || 0), 0) || 0,
					groups: (apifyData.amenities || []).map(group => ({
						title: group.title || '',
						amenities: (group.values || []).map(amenity => ({
							title: amenity.title || '',
							subtitle: amenity.subtitle || null,
							icon: amenity.icon || null,
							available: amenity.available !== false
						}))
					}))
				},
				location: {
					title: "Where you'll be",
					subtitle: "Manhattan Beach, California, United States",
					coordinates: {
						lat: apifyData.coordinates?.latitude || 33.90517,
						lng: apifyData.coordinates?.longitude || -118.41958
					},
					mapMarkerType: 'CIRCLE',
					mapMarkerRadiusInMeters: 200,
					locationDetails: {
						preview: null,
						full: []
					},
					verification: null,
					disclaimer: null,
					homeIcon: null,
					address: null,
					addressTitle: null,
					locationDisclaimer: 'Exact location provided after booking'
				},
				host: {
					title: 'Meet your host',
					host: {
						name: 'Host',
						userId: '',
						isSuperhost: false,
						isVerified: false,
						profilePicture: '',
						stats: {
							reviews: apifyData.rating?.reviewsCount || 0,
							rating: apifyData.rating?.guestSatisfaction || 0,
							yearsHosting: 0,
							monthsHosting: 0
						}
					},
					about: null,
					highlights: [],
					cohosts: [],
					details: null,
					disclaimer: null
				},
				policies: {
					title: 'Things to know',
					cancellation: {
						title: 'Cancellation policy',
						policy: apifyData.cancellationPolicies?.[0]?.policyName || 'Limited',
						details: '',
						milestones: [],
						disclaimers: []
					},
					houseRules: {
						title: 'House rules',
						subtitle: '',
						sections: (apifyData.houseRules?.general || []).map(section => ({
							title: section.title || '',
							rules: (section.values || []).map(rule => ({
								title: rule.title || '',
								icon: rule.icon || null,
								subtitle: rule.additionalInfo || null,
								details: null
							}))
						}))
					},
					safety: {
						title: 'Safety & property',
						subtitle: '',
						items: []
					},
					disclaimer: null
				},
				description: {
					title: 'About this space',
					sections: [
						{
							title: null,
							content: apifyData.metaDescription || ''
						},
						...(apifyData.highlights || []).map(h => ({
							title: h.title || null,
							content: h.subtitle || ''
						}))
					]
				},
				gallery: {
					title: 'Photo tour',
					rooms: [
						{
							title: null,
							images: (apifyData.images || []).map(img => ({
								caption: img.caption || null,
								accessibilityLabel: img.caption || null,
								src: img.imageUrl || '',
								aspectRatio: img.orientation === 'PORTRAIT' ? 0.75 : 1.5,
								orientation: img.orientation || 'LANDSCAPE'
							}))
						}
					]
				},
				reviews: []
			}
		}
		
		console.log('✅ Transformation complete')
		console.log(`   - Title: ${transformedListing.data.h1Title}`)
		console.log(`   - Images: ${transformedListing.data.gallery.rooms[0].images.length}`)
		console.log(`   - Amenities: ${transformedListing.data.amenities.count}`)
		console.log(`   - Rating: ${transformedListing.data.overview.rating}`)
		
		// Update database
		console.log('\n📝 Updating database...')
		await db
			.update(properties)
			.set({
				listingData: transformedListing,
				pricePerNight: 250 // Default price
			})
			.where(eq(properties.id, propertyData.id))
		
		console.log('✅ Database updated successfully')
		
		await client.end()
	} catch (error) {
		console.error('❌ Error:', error)
		await client.end()
		process.exit(1)
	}
}

transformPropertyData()
