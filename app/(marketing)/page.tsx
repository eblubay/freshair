import { AmenitiesPanel } from "@/app/_components/AmenitiesPanel"
import { AvailabilityRequest } from "@/app/_components/AvailabilityRequest"
import { PhotoGallery } from "@/app/_components/PhotoGallery"
import { PropertyMap } from "@/app/_components/PropertyMap"
import { SiteFooter } from "@/app/_components/SiteFooter"
import { SiteHeader } from "@/app/_components/SiteHeader"
import { getFeaturedProperty } from "@/lib/view-model"
import Image from "next/image"
import Link from "next/link"

const NAV = [
	{ label: "Local Guide", href: "/guide" },
	{ label: "The Stay", href: "#the-stay" },
	{ label: "Gallery", href: "#gallery" },
	{ label: "Amenities", href: "#amenities" },
	{ label: "Location", href: "#location" },
	{ label: "Availability", href: "#availability" }
]

export default async function HomePage() {
	const property = await getFeaturedProperty()

	if (!property) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] text-[#28323b]">
				<div className="text-center">
					<h1 className="font-serif text-3xl">Property not available</h1>
					<p className="mt-3 text-[15px] text-[#5d6b78]">Please check back soon.</p>
				</div>
			</div>
		)
	}

	const hero = property.photos[0]
	const editorial = property.photos.slice(1, 5)

	return (
		<div className="min-h-screen bg-[#fdfbf7] text-[#28323b]">
			<SiteHeader nav={NAV} ctaHref="#availability" />

			{/* Hero — original photograph, unmodified */}
			<section className="relative h-[80vh] min-h-[520px] w-full">
				{hero && (
					<Image
						src={hero.src}
						alt={hero.caption || property.title}
						fill
						sizes="100vw"
						priority
						className="object-cover"
					/>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-[#1b232b]/75 via-[#1b232b]/15 to-[#1b232b]/25" />
				<div className="absolute inset-x-0 bottom-0">
					<div className="mx-auto max-w-[1400px] px-5 pb-16 sm:px-8 lg:px-14">
						<p className="text-[11px] uppercase tracking-[0.28em] text-[#f1e4d8]">
							{property.location}
						</p>
						<h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight text-[#fdfbf7] sm:text-6xl">
							{property.title}
						</h1>
						<div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px] text-[#f1e4d8]">
							<span>
								{property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
							</span>
							<span>
								{property.bathrooms} {property.bathrooms === 1 ? "bath" : "baths"}
							</span>
							<span>Up to {property.guests} guests</span>
							{property.rating !== null && (
								<span>
									{property.rating.toFixed(2)}
									{property.reviewCount > 0 && ` · ${property.reviewCount} reviews`}
								</span>
							)}
						</div>
						<div className="mt-10 flex flex-wrap gap-4">
							<a
								href="#availability"
								className="bg-[#fdfbf7] px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-[#28323b] transition-colors hover:bg-[#f1e4d8]"
							>
								Request availability
							</a>
							<Link
								href={`/listing/${property.id}`}
								className="border border-[#fdfbf7] px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-[#fdfbf7] transition-colors hover:bg-[#fdfbf7]/10"
							>
								View full details
							</Link>
							<Link
								href="/guide"
								className="border border-[#fdfbf7] px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-[#fdfbf7] transition-colors hover:bg-[#fdfbf7]/10"
							>
								Explore the Local Guide
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* The Stay */}
			<section id="the-stay" className="scroll-mt-24 border-b border-[#e6ddcf]">
				<div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-14">
					<div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20">
						<div>
							<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
								The Stay
							</span>
							<h2 className="mt-4 max-w-xl font-serif text-3xl leading-snug sm:text-5xl">
								A bright retreat a short walk from the sand
							</h2>
							{property.descriptionParagraphs.length > 0 && (
								<div className="mt-8 space-y-5 text-[16px] leading-[1.75] text-[#5d6b78]">
									{property.descriptionParagraphs.slice(0, 3).map((paragraph) => (
										<p key={paragraph.slice(0, 40)}>{paragraph}</p>
									))}
								</div>
							)}
							<Link
								href={`/listing/${property.id}`}
								className="mt-10 inline-block border border-[#c9bda9] px-8 py-3 text-[11px] uppercase tracking-[0.18em] text-[#3d4b57] transition-colors hover:border-[#3d4b57]"
							>
								View full details
							</Link>
						</div>

						{editorial.length > 0 && (
							<div className="grid grid-cols-2 gap-4">
								{editorial.map((photo, index) => (
									<div
										key={photo.src}
										className={`relative overflow-hidden ${
											index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"
										}`}
									>
										<Image
											src={photo.src}
											alt={photo.caption || property.title}
											fill
											sizes="(max-width: 1024px) 50vw, 25vw"
											className="object-cover"
										/>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Gallery */}
			<section id="gallery" className="scroll-mt-24 border-b border-[#e6ddcf]">
				<div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-14">
					<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
						Photography
					</span>
					<h2 className="mt-4 font-serif text-3xl sm:text-5xl">
						{property.photos.length} photographs
					</h2>
					<div className="mt-12">
						<PhotoGallery photos={property.photos} />
					</div>
				</div>
			</section>

			{/* Amenities */}
			<section id="amenities" className="scroll-mt-24 border-b border-[#e6ddcf]">
				<div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-14">
					<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
						Amenities
					</span>
					<h2 className="mt-4 font-serif text-3xl sm:text-5xl">
						{property.amenityCount} amenities included
					</h2>
					<div className="mt-12">
						<AmenitiesPanel
							groups={property.amenityGroups}
							count={property.amenityCount}
							highlights={property.highlightAmenities}
						/>
					</div>
				</div>
			</section>

			{/* Ratings — real values only */}
			{property.rating !== null && (
				<section className="border-b border-[#e6ddcf]">
					<div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-14">
						<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
							Guest Ratings
						</span>
						<div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
							<span className="font-serif text-5xl">{property.rating.toFixed(2)}</span>
							{property.reviewCount > 0 && (
								<span className="text-[15px] text-[#5d6b78]">
									from {property.reviewCount} guest reviews
								</span>
							)}
						</div>
						{property.ratingBreakdown.length > 0 && (
							<div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
								{property.ratingBreakdown.map((entry) => (
									<div key={entry.label}>
										<div className="flex items-baseline justify-between">
											<span className="text-[13px] uppercase tracking-[0.12em] text-[#8d7c66]">
												{entry.label}
											</span>
											<span className="text-[15px] tabular-nums">
												{entry.value.toFixed(2)}
											</span>
										</div>
										<div className="mt-2 h-px w-full bg-[#e6ddcf]">
											<div
												className="h-px bg-[#c2683f]"
												style={{ width: `${(entry.value / 5) * 100}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			)}

			{/* Location — real MapLibre / OpenFreeMap render */}
			<section id="location" className="scroll-mt-24 border-b border-[#e6ddcf]">
				<div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-14">
					<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
						Location
					</span>
					<h2 className="mt-4 font-serif text-3xl sm:text-5xl">{property.location}</h2>
					<div className="mt-12 h-[460px] w-full overflow-hidden border border-[#e6ddcf]">
						<PropertyMap
							latitude={property.coordinates.lat}
							longitude={property.coordinates.lng}
							label={property.location}
						/>
					</div>
					<p className="mt-4 text-[13px] text-[#8d7c66]">{property.locationDisclaimer}</p>
				</div>
			</section>

			{/* Availability request */}
			<section id="availability" className="scroll-mt-24">
				<div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-14">
					<div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_480px] lg:gap-20">
						<div>
							<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
								Availability
							</span>
							<h2 className="mt-4 max-w-xl font-serif text-3xl leading-snug sm:text-5xl">
								Tell us your dates
							</h2>
							<p className="mt-8 max-w-md text-[16px] leading-[1.75] text-[#5d6b78]">
								Send your dates and we will reply by email to confirm whether the home is
								free. Requests are not confirmed reservations and no payment is taken
								here.
							</p>
						</div>
						<AvailabilityRequest propertyId={property.id} maxGuests={property.guests} />
					</div>
				</div>
			</section>

			<SiteFooter location={property.location} />
		</div>
	)
}
