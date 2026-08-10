import { AmenitiesPanel } from "@/app/_components/AmenitiesPanel"
import { AvailabilityRequest } from "@/app/_components/AvailabilityRequest"
import { PhotoGallery } from "@/app/_components/PhotoGallery"
import { PropertyMap } from "@/app/_components/PropertyMap"
import { SiteFooter } from "@/app/_components/SiteFooter"
import { SiteHeader } from "@/app/_components/SiteHeader"
import { getPropertyView } from "@/lib/view-model"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

type Params = Promise<{ id: string }>

const NAV = [
	{ label: "Home", href: "/" },
	{ label: "The Stay", href: "#the-stay" },
	{ label: "Gallery", href: "#gallery" },
	{ label: "Amenities", href: "#amenities" },
	{ label: "Location", href: "#location" },
	{ label: "Reviews", href: "#reviews" },
	{ label: "Contact", href: "#availability" }
]

export default async function ListingPage({ params }: { params: Params }) {
	const { id } = await params
	const property = await getPropertyView(id)

	if (!property) notFound()

	const hero = property.photos[0]

	return (
		<div className="min-h-screen bg-[#fdfbf7] text-[#28323b]">
			<SiteHeader nav={NAV} ctaHref="#availability" />

			{/* Hero — one original photograph, unmodified */}
			<section className="relative h-[62vh] min-h-[420px] w-full sm:h-[72vh]">
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
				<div className="absolute inset-0 bg-gradient-to-t from-[#1b232b]/70 via-[#1b232b]/10 to-transparent" />
				<div className="absolute inset-x-0 bottom-0">
					<div className="mx-auto max-w-[1400px] px-5 pb-12 sm:px-8 lg:px-14">
						<p className="text-[11px] uppercase tracking-[0.28em] text-[#f1e4d8]">
							{property.location}
						</p>
						<h1 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-[#fdfbf7] sm:text-5xl">
							{property.title}
						</h1>
					</div>
				</div>
			</section>

			{/* Facts */}
			<section id="the-stay" className="border-b border-[#e6ddcf] scroll-mt-24">
				<div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:px-14">
					<div className="grid grid-cols-2 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
						<Fact label="Guests" value={String(property.guests)} />
						<Fact label="Bedrooms" value={String(property.bedrooms)} />
						<Fact label="Beds" value={String(property.beds)} />
						<Fact label="Baths" value={String(property.bathrooms)} />
						{property.rating !== null && (
							<Fact label="Rating" value={property.rating.toFixed(2)} />
						)}
						{property.reviewCount > 0 && (
							<Fact label="Reviews" value={String(property.reviewCount)} />
						)}
					</div>
				</div>
			</section>

			<div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-14">
				<div className="grid grid-cols-1 gap-16 py-16 lg:grid-cols-[1fr_400px] lg:gap-20">
					<div className="min-w-0">
						{/* Story */}
						{property.descriptionParagraphs.length > 0 && (
							<section>
								<SectionLabel>The Stay</SectionLabel>
								<h2 className="mt-4 max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
									A bright retreat a short walk from the sand
								</h2>
								<div className="mt-8 max-w-2xl space-y-5 text-[16px] leading-[1.75] text-[#5d6b78]">
									{property.descriptionParagraphs.map((paragraph) => (
										<p key={paragraph.slice(0, 40)}>{paragraph}</p>
									))}
								</div>
							</section>
						)}

						{/* Sleeping arrangements — real data only */}
						<section className="mt-20 border-t border-[#e6ddcf] pt-16">
							<SectionLabel>Sleeping &amp; Space</SectionLabel>
							<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
								<SpaceCard
									title={`${property.bedrooms} ${property.bedrooms === 1 ? "bedroom" : "bedrooms"}`}
									detail={`${property.beds} ${property.beds === 1 ? "bed" : "beds"}`}
								/>
								<SpaceCard
									title={`${property.bathrooms} ${property.bathrooms === 1 ? "bathroom" : "bathrooms"}`}
									detail={`Sleeps up to ${property.guests}`}
								/>
							</div>
						</section>

						{/* Gallery */}
						<section id="gallery" className="mt-20 scroll-mt-24 border-t border-[#e6ddcf] pt-16">
							<SectionLabel>Photography</SectionLabel>
							<h2 className="mt-4 font-serif text-3xl sm:text-4xl">
								{property.photos.length} photographs
							</h2>
							<div className="mt-10">
								<PhotoGallery photos={property.photos} />
							</div>
						</section>

						{/* Amenities */}
						<section
							id="amenities"
							className="mt-20 scroll-mt-24 border-t border-[#e6ddcf] pt-16"
						>
							<SectionLabel>Amenities</SectionLabel>
							<h2 className="mt-4 font-serif text-3xl sm:text-4xl">
								{property.amenityCount} amenities included
							</h2>
							<div className="mt-10">
								<AmenitiesPanel
									groups={property.amenityGroups}
									count={property.amenityCount}
									highlights={property.highlightAmenities}
								/>
							</div>
						</section>

						{/* Reviews — real numbers only, no invented text */}
						{property.rating !== null && (
							<section
								id="reviews"
								className="mt-20 scroll-mt-24 border-t border-[#e6ddcf] pt-16"
							>
								<SectionLabel>Guest Ratings</SectionLabel>
								<div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
									<span className="font-serif text-5xl">
										{property.rating.toFixed(2)}
									</span>
									{property.reviewCount > 0 && (
										<span className="text-[15px] text-[#5d6b78]">
											from {property.reviewCount} guest reviews
										</span>
									)}
								</div>
								{property.ratingBreakdown.length > 0 && (
									<div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
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
							</section>
						)}

						{/* Location */}
						<section
							id="location"
							className="mt-20 scroll-mt-24 border-t border-[#e6ddcf] pt-16"
						>
							<SectionLabel>Location</SectionLabel>
							<h2 className="mt-4 font-serif text-3xl sm:text-4xl">
								{property.location}
							</h2>
							<div className="mt-10 h-[420px] w-full overflow-hidden border border-[#e6ddcf]">
								<PropertyMap
									latitude={property.coordinates.lat}
									longitude={property.coordinates.lng}
									label={property.location}
								/>
							</div>
							<p className="mt-4 text-[13px] text-[#8d7c66]">
								{property.locationDisclaimer}
							</p>
						</section>

						{/* House rules — only if real */}
						{property.houseRules.length > 0 && (
							<section className="mt-20 border-t border-[#e6ddcf] pt-16">
								<SectionLabel>Good to Know</SectionLabel>
								<ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
									{property.houseRules.map((rule) => (
										<li
											key={rule.title}
											className="border-b border-[#efe8dd] pb-4 text-[15px] text-[#3d4b57]"
										>
											{rule.title}
											{rule.detail && (
												<span className="mt-1 block text-[13px] text-[#8d7c66]">
													{rule.detail}
												</span>
											)}
										</li>
									))}
								</ul>
							</section>
						)}

						{/* Host — never "Hosted by Host" / "0 years hosting" */}
						<section className="mt-20 border-t border-[#e6ddcf] pt-16">
							<SectionLabel>Hospitality</SectionLabel>
							<div className="mt-8 flex items-center gap-5">
								{property.host.photo ? (
									<Image
										src={property.host.photo}
										alt={property.host.name ?? "Your host"}
										width={64}
										height={64}
										className="h-16 w-16 rounded-full object-cover"
									/>
								) : (
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f1e4d8] font-serif text-xl text-[#c2683f]">
										S
									</div>
								)}
								<div>
									<p className="font-serif text-xl">
										{property.host.name
											? `Hosted by ${property.host.name}`
											: "Your Host"}
									</p>
									<p className="mt-1 text-[14px] text-[#5d6b78]">
										Self check-in · Local support throughout your stay
									</p>
								</div>
							</div>
						</section>
					</div>

					{/* Availability request */}
					<aside id="availability" className="scroll-mt-24 lg:sticky lg:top-28 lg:self-start">
						<AvailabilityRequest
							propertyId={property.id}
							maxGuests={property.guests}
						/>
						<Link
							href="/"
							className="mt-6 block text-center text-[12px] uppercase tracking-[0.16em] text-[#8d7c66] transition-colors hover:text-[#c2683f]"
						>
							← Back to home
						</Link>
					</aside>
				</div>
			</div>

			<SiteFooter location={property.location} />
		</div>
	)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">
			{children}
		</span>
	)
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="font-serif text-3xl">{value}</div>
			<div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8d7c66]">
				{label}
			</div>
		</div>
	)
}

function SpaceCard({ title, detail }: { title: string; detail: string }) {
	return (
		<div className="border border-[#e6ddcf] bg-white px-6 py-7">
			<p className="font-serif text-xl">{title}</p>
			<p className="mt-2 text-[14px] text-[#5d6b78]">{detail}</p>
		</div>
	)
}
