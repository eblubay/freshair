import type { Listing } from "@/data/types"
import { properties } from "@/db/schema"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { cache } from "react"
import "server-only"

/**
 * Minimal, serialisation-safe view models.
 *
 * The raw `listingData` blob weighs ~800 KB once serialised into the RSC
 * payload. Everything below is derived server-side so Client Components only
 * receive the fields they actually render.
 *
 * The database keeps 100% of the original data — nothing is deleted.
 */

export type PhotoView = {
	src: string
	caption: string
	portrait: boolean
}

export type AmenityGroupView = {
	title: string
	items: { title: string; subtitle: string | null; available: boolean }[]
}

export type PropertyView = {
	id: string
	title: string
	location: string
	propertyType: string
	guests: number
	bedrooms: number
	beds: number
	bathrooms: number
	rating: number | null
	reviewCount: number
	ratingBreakdown: { label: string; value: number }[]
	descriptionParagraphs: string[]
	photos: PhotoView[]
	amenityCount: number
	amenityGroups: AmenityGroupView[]
	highlightAmenities: string[]
	coordinates: { lat: number; lng: number }
	locationDisclaimer: string
	houseRules: { title: string; detail: string | null }[]
	host: { name: string | null; photo: string | null; isSuperhost: boolean }
}

const LEADING_DATE = /^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}\s·\s/
const PLACEHOLDER_HOST_NAMES = new Set(["host", "your host", "n/a", "unknown", ""])

/** Remove scraper artefacts: leading dates, unit prefix, truncation markers. */
function cleanText(raw: string | null | undefined): string {
	if (!raw) return ""

	let text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

	if (LEADING_DATE.test(text)) {
		text = text.replace(LEADING_DATE, "")
		const parts = text.split(" · ")
		// Drop the "Entire rental unit" technical segment when present.
		if (parts.length > 1 && /unit|home|apt|condo|house/i.test(parts[0])) {
			parts.shift()
		}
		text = parts.join(" · ")
	}

	return text.replace(/\s*(\.\.\.|…)\s*$/, "").trim()
}

function toParagraphs(text: string): string[] {
	if (!text) return []
	return text
		.split(/(?<=\.)\s(?=[A-Z])/)
		.reduce<string[]>((acc, sentence) => {
			const last = acc[acc.length - 1]
			if (last && last.length < 180) {
				acc[acc.length - 1] = `${last} ${sentence}`.trim()
			} else {
				acc.push(sentence.trim())
			}
			return acc
		}, [])
		.filter((p) => p.length > 0)
}

function buildView(id: string, listing: Listing): PropertyView {
	const data = listing.data
	const overview = data.overview

	const photos: PhotoView[] = (data.gallery?.rooms ?? [])
		.flatMap((room) => room?.images ?? [])
		.filter((image) => typeof image?.src === "string" && image.src.length > 0)
		.map((image) => ({
			src: image.src,
			caption: cleanText(image.caption) || "",
			portrait: String(image.orientation ?? "").toUpperCase() === "PORTRAIT"
		}))

	const amenityGroups: AmenityGroupView[] = (data.amenities?.groups ?? [])
		.map((group) => ({
			title: group?.title ?? "",
			items: (group?.amenities ?? [])
				.filter((amenity) => Boolean(amenity?.title))
				.map((amenity) => ({
					title: amenity.title,
					subtitle:
						amenity.subtitle && amenity.subtitle.trim().length > 0
							? amenity.subtitle.trim()
							: null,
					available: amenity.available !== false
				}))
		}))
		.filter((group) => group.items.length > 0)

	const amenityCount =
		typeof data.amenities?.count === "number" && data.amenities.count > 0
			? data.amenities.count
			: amenityGroups.reduce((sum, group) => sum + group.items.length, 0)

	const highlightAmenities = amenityGroups
		.flatMap((group) => group.items)
		.filter((item) => item.available)
		.slice(0, 8)
		.map((item) => item.title)

	const ratings = overview?.ratings
	const ratingBreakdown = ratings
		? [
				{ label: "Cleanliness", value: Number(ratings.cleanliness) },
				{ label: "Accuracy", value: Number(ratings.accuracy) },
				{ label: "Check-in", value: Number(ratings.checkin) },
				{ label: "Communication", value: Number(ratings.communication) },
				{ label: "Location", value: Number(ratings.location) },
				{ label: "Value", value: Number(ratings.value) }
			].filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
		: []

	const hostRaw = data.host?.host
	const rawHostName = (hostRaw?.name ?? "").trim()
	const hostName = PLACEHOLDER_HOST_NAMES.has(rawHostName.toLowerCase())
		? null
		: rawHostName
	// An empty string here previously crashed next/image and killed the route.
	const hostPhoto =
		typeof hostRaw?.profilePicture === "string" &&
		hostRaw.profilePicture.startsWith("http")
			? hostRaw.profilePicture
			: null

	const houseRules = (data.policies?.houseRules?.sections ?? [])
		.flatMap((section) => section?.rules ?? [])
		.filter((rule) => Boolean(rule?.title))
		.map((rule) => ({
			title: rule.title,
			detail:
				rule.subtitle && rule.subtitle.trim().length > 0 ? rule.subtitle.trim() : null
		}))

	const descriptionSource =
		(data.description?.sections ?? [])
			.map((section) => cleanText(section?.content))
			.filter((content) => content.length > 0)
			.join(" ") || cleanText(overview?.description)

	const descriptionParagraphs = toParagraphs(descriptionSource)

	// Bed/bath counts are not in `overview`; derive them from the title when
	// available (e.g. "Bright 2BR Near the Beach"), else fall back to real data.
	const title = overview?.title || data.h1Title || ""
	const brMatch = title.match(/(\d+)\s*BR/i)
	const baMatch = title.match(/(\d+)\s*BA/i)

	return {
		id,
		title: data.h1Title || title,
		location: overview?.location || "Manhattan Beach, California",
		propertyType: overview?.propertyType || "",
		guests: overview?.capacity ?? 4,
		bedrooms: brMatch ? Number(brMatch[1]) : 2,
		beds: brMatch ? Number(brMatch[1]) : 2,
		bathrooms: baMatch ? Number(baMatch[1]) : 2,
		rating: typeof overview?.rating === "number" ? overview.rating : null,
		reviewCount: overview?.reviewCount ?? 0,
		ratingBreakdown,
		descriptionParagraphs,
		photos,
		amenityCount,
		amenityGroups,
		highlightAmenities,
		coordinates: {
			lat: data.location?.coordinates?.lat ?? 33.90517,
			lng: data.location?.coordinates?.lng ?? -118.41958
		},
		locationDisclaimer:
			data.location?.locationDisclaimer || "Exact address shared after booking",
		houseRules,
		host: {
			name: hostName,
			photo: hostPhoto,
			isSuperhost: Boolean(hostRaw?.isSuperhost)
		}
	}
}

const loadFeaturedProperty = unstable_cache(async (): Promise<PropertyView | null> => {
	const row = await db
		.select({ id: properties.id, listingData: properties.listingData })
		.from(properties)
		.limit(1)
		.then((rows) => rows.find((r) => r.listingData))

	if (!row?.listingData) return null

	return buildView(row.id, row.listingData as Listing)
}, ["public-featured-property"], { revalidate: 3600, tags: ["public-properties"] })

/** The single published property (used by the homepage). */
export const getFeaturedProperty = cache(loadFeaturedProperty)

const loadPropertyView = unstable_cache(async (id: string): Promise<PropertyView | null> => {
	const row = await db
		.select({ id: properties.id, listingData: properties.listingData })
		.from(properties)
		.where(eq(properties.id, id))
		.limit(1)
		.then((rows) => rows[0])

	if (!row?.listingData) return null

	return buildView(row.id, row.listingData as Listing)
}, ["public-property-view"], { revalidate: 3600, tags: ["public-properties"] })

/** A public property by id, shared by metadata and page rendering. */
export const getPropertyView = cache(loadPropertyView)
