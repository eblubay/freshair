import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { properties } from "@/db/schema"
import { MapPin, Users, Home, Sparkles, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { sql } from "drizzle-orm"
import { MapSection } from "../_components/MapSection"

export default async function HomePage() {
	const property = await db
		.select()
		.from(properties)
		.where(sql`${properties.listingData} IS NOT NULL`)
		.limit(1)
		.then((rows) => rows[0])

	if (!property || !property.listingData) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-stone-50">
				<div className="text-center">
					<h1 className="text-2xl font-light mb-4 text-stone-900">Property Not Available</h1>
					<p className="text-stone-600">Please check back soon.</p>
				</div>
			</div>
		)
	}

	const listing = property.listingData as any
	const data = listing.data
	const images = data.gallery?.rooms?.[0]?.images || []
	const heroImage = images[0]?.src || ""
	const coordinates = data.location?.coordinates || { lat: 33.90517, lng: -118.41958 }

	return (
		<div className="min-h-screen bg-white">
			{/* Branded Header */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="flex items-center justify-between h-20">
						{/* Official Logo */}
						<Link href="/" className="flex items-center">
							<Image
								src="/branding/logo.png"
								alt="Shell By The Shore"
								width={180}
								height={60}
								className="h-12 w-auto"
								priority
							/>
						</Link>
						<nav className="hidden md:flex items-center gap-8 text-sm">
							<a href="#about" className="text-stone-700 hover:text-stone-900 transition-colors">The Stay</a>
							<a href="#gallery" className="text-stone-700 hover:text-stone-900 transition-colors">Gallery</a>
							<a href="#amenities" className="text-stone-700 hover:text-stone-900 transition-colors">Amenities</a>
							<a href="#location" className="text-stone-700 hover:text-stone-900 transition-colors">Location</a>
							<a href="#reviews" className="text-stone-700 hover:text-stone-900 transition-colors">Reviews</a>
							<a href="#availability">
								<Button size="sm" className="bg-stone-900 hover:bg-stone-800">
									Check Availability
								</Button>
							</a>
						</nav>
						{/* Mobile Menu Button */}
						<button className="md:hidden p-2">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
					</div>
				</div>
			</header>

			{/* Cinematic Hero */}
			<section className="relative h-screen mt-20">
				<div className="absolute inset-0">
					<Image
						src={heroImage}
						alt="Shell St Beach Retreat"
						fill
						className="object-cover"
						priority
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />
				</div>
				<div className="relative h-full flex items-end">
					<div className="container mx-auto px-6 lg:px-16 xl:px-32 pb-24">
						<div className="max-w-3xl text-white">
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 text-sm">
								<Sparkles className="h-4 w-4" />
								<span>Rated {data.overview?.rating || "4.93"} · Manhattan Beach</span>
							</div>
							<h1 className="text-6xl md:text-7xl lg:text-8xl font-light mb-6 leading-tight">
								Coastal<br />Sanctuary
							</h1>
							<p className="text-xl md:text-2xl font-light text-white/90 mb-8 max-w-2xl">
								A bright, modern retreat just steps from the Pacific. 
								Experience the best of Manhattan Beach living.
							</p>
							<div className="flex flex-wrap gap-6 text-lg font-light">
								<div className="flex items-center gap-2">
									<Home className="h-5 w-5" />
									<span>2 Bedrooms · 2 Baths</span>
								</div>
								<div className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									<span>Up to 4 Guests</span>
								</div>
								<div className="flex items-center gap-2">
									<MapPin className="h-5 w-5" />
									<span>1.5 Blocks to Beach</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Editorial About */}
			<section id="about" className="py-32 bg-stone-50">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
						<div>
							<div className="text-sm uppercase tracking-widest text-stone-500 mb-4">
								The Experience
							</div>
							<h2 className="text-5xl md:text-6xl font-light text-stone-900 mb-8 leading-tight">
								Your Manhattan Beach Escape
							</h2>
							<div className="space-y-6 text-lg text-stone-700 leading-relaxed font-light">
								<p>
									Nestled in the heart of El Porto, this thoughtfully designed retreat offers 
									the perfect blend of coastal charm and modern comfort. Wake to ocean breezes, 
									sip morning coffee on your private balcony, and spend sun-soaked days exploring 
									one of Southern California's most coveted beach communities.
								</p>
								<p>
									The space features an open-concept living area flooded with natural light, 
									a fully equipped kitchen for culinary adventures, and two serene bedrooms 
									designed for restful nights. Every detail has been considered to ensure 
									your stay is nothing short of exceptional.
								</p>
								<p>
									With the sand just a short stroll away and the vibrant energy of Manhattan Beach 
									at your doorstep, this is more than a vacation rental—it's your gateway to 
									the California coastal lifestyle.
								</p>
							</div>
							<div className="mt-10">
								<Link href={`/listing/${property.id}`}>
									<Button size="lg" variant="outline" className="group border-stone-300">
										Explore the Space
										<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
									</Button>
								</Link>
							</div>
						</div>
						<div className="relative">
							<div className="grid grid-cols-2 gap-4">
								{images.slice(1, 5).map((img: any, idx: number) => (
									<div
										key={idx}
										className={`relative overflow-hidden ${
											idx === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"
										}`}
									>
										<Image
											src={img.src}
											alt={img.caption || `Interior ${idx + 1}`}
											fill
											className="object-cover hover:scale-105 transition-transform duration-700"
										/>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Highlights */}
			<section className="py-32">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="text-center mb-20">
						<div className="text-sm uppercase tracking-widest text-stone-500 mb-4">
							What Sets Us Apart
						</div>
						<h2 className="text-5xl md:text-6xl font-light text-stone-900">
							Designed for Comfort
						</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-16">
						<div className="text-center">
							<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-stone-100 flex items-center justify-center">
								<svg className="w-10 h-10 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
								</svg>
							</div>
							<h3 className="text-2xl font-light mb-3 text-stone-900">Prime Location</h3>
							<p className="text-stone-600 leading-relaxed">
								Steps from Manhattan Beach and the iconic Strand bike path. 
								Restaurants, shops, and surf breaks at your doorstep.
							</p>
						</div>
						<div className="text-center">
							<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-stone-100 flex items-center justify-center">
								<svg className="w-10 h-10 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							</div>
							<h3 className="text-2xl font-light mb-3 text-stone-900">Natural Light</h3>
							<p className="text-stone-600 leading-relaxed">
								Floor-to-ceiling windows and a private balcony with partial ocean views 
								create an airy, sun-filled atmosphere.
							</p>
						</div>
						<div className="text-center">
							<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-stone-100 flex items-center justify-center">
								<svg className="w-10 h-10 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
								</svg>
							</div>
							<h3 className="text-2xl font-light mb-3 text-stone-900">Thoughtful Amenities</h3>
							<p className="text-stone-600 leading-relaxed">
								From beach gear to a fully stocked kitchen, every detail is designed 
								to make your stay effortless and memorable.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Gallery */}
			<section id="gallery" className="py-32 bg-stone-50">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="text-center mb-20">
						<div className="text-sm uppercase tracking-widest text-stone-500 mb-4">
							Visual Tour
						</div>
						<h2 className="text-5xl md:text-6xl font-light text-stone-900 mb-6">
							See the Space
						</h2>
						<p className="text-lg text-stone-600 max-w-2xl mx-auto">
							Explore every corner of your coastal retreat through our curated photo collection
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{images.slice(0, 9).map((img: any, idx: number) => (
							<div
								key={idx}
								className={`relative overflow-hidden ${
									idx === 0 ? "md:col-span-2 md:row-span-2 aspect-[16/10]" : "aspect-[4/3]"
								}`}
							>
								<Image
									src={img.src}
									alt={img.caption || `Gallery ${idx + 1}`}
									fill
									className="object-cover hover:scale-105 transition-transform duration-700"
								/>
							</div>
						))}
					</div>
					<div className="text-center mt-12">
						<Link href={`/listing/${property.id}#gallery`}>
							<Button size="lg" variant="outline" className="border-stone-300">
								View All {images.length} Photos
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Amenities Preview */}
			<section id="amenities" className="py-32">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="text-center mb-20">
						<div className="text-sm uppercase tracking-widest text-stone-500 mb-4">
							What's Included
						</div>
						<h2 className="text-5xl md:text-6xl font-light text-stone-900 mb-6">
							Everything You Need
						</h2>
						<p className="text-lg text-stone-600 max-w-2xl mx-auto">
							58 thoughtfully curated amenities to make your stay comfortable and memorable
						</p>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
						{[
							{ icon: "🏖️", title: "Beach Essentials" },
							{ icon: "🍳", title: "Full Kitchen" },
							{ icon: "📶", title: "High-Speed WiFi" },
							{ icon: "🅿️", title: "Free Parking" },
							{ icon: "🧺", title: "Washer & Dryer" },
							{ icon: "🔥", title: "Indoor Fireplace" },
							{ icon: "🌡️", title: "Heating & Cooling" },
							{ icon: "📺", title: "Smart TV" },
						].map((amenity, idx) => (
							<div key={idx} className="text-center p-6 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
								<div className="text-4xl mb-3">{amenity.icon}</div>
								<div className="text-sm font-medium text-stone-900">{amenity.title}</div>
							</div>
						))}
					</div>
					<div className="text-center mt-12">
						<Link href={`/listing/${property.id}#amenities`}>
							<Button size="lg" variant="outline" className="border-stone-300">
								View All 58 Amenities
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Reviews */}
			<section id="reviews" className="py-32 bg-stone-50">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="text-center mb-20">
						<div className="text-sm uppercase tracking-widest text-stone-500 mb-4">
							Guest Experiences
						</div>
						<h2 className="text-5xl md:text-6xl font-light text-stone-900 mb-6">
							Rated {data.overview?.rating || "4.93"}
						</h2>
						<p className="text-lg text-stone-600">
							Based on {data.reviews?.length || 14} verified guest reviews
						</p>
					</div>
					<div className="max-w-4xl mx-auto">
						<div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
							<div>
								<div className="text-3xl font-light text-stone-900 mb-2">5.0</div>
								<div className="text-sm text-stone-600">Cleanliness</div>
							</div>
							<div>
								<div className="text-3xl font-light text-stone-900 mb-2">5.0</div>
								<div className="text-sm text-stone-600">Accuracy</div>
							</div>
							<div>
								<div className="text-3xl font-light text-stone-900 mb-2">5.0</div>
								<div className="text-sm text-stone-600">Check-in</div>
							</div>
							<div>
								<div className="text-3xl font-light text-stone-900 mb-2">5.0</div>
								<div className="text-sm text-stone-600">Communication</div>
							</div>
							<div>
								<div className="text-3xl font-light text-stone-900 mb-2">4.93</div>
								<div className="text-sm text-stone-600">Location</div>
							</div>
							<div>
								<div className="text-3xl font-light text-stone-900 mb-2">4.86</div>
								<div className="text-sm text-stone-600">Value</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Location */}
			<section id="location" className="py-32">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="text-center mb-20">
						<div className="text-sm uppercase tracking-widest text-stone-500 mb-4">
							Where You'll Stay
						</div>
						<h2 className="text-5xl md:text-6xl font-light text-stone-900 mb-6">
							Manhattan Beach
						</h2>
						<p className="text-lg text-stone-600 max-w-2xl mx-auto">
							Located in the vibrant El Porto neighborhood, with easy access to beaches, 
							dining, and the best of coastal California living
						</p>
					</div>
					<div className="max-w-5xl mx-auto">
						<div className="aspect-[16/9] rounded-lg overflow-hidden bg-stone-200">
							<MapSection
								coordinates={{
									latitude: coordinates.lat,
									longitude: coordinates.lng
								}}
								radiusInMeters={500}
							/>
						</div>
						<div className="mt-8 text-center text-sm text-stone-500">
							<p>Exact location provided after booking</p>
						</div>
					</div>
				</div>
			</section>

			{/* Availability CTA */}
			<section id="availability" className="py-32 bg-stone-900 text-white">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32 text-center">
					<h2 className="text-5xl md:text-6xl font-light mb-8">
						Ready to Experience<br />Coastal Living?
					</h2>
					<p className="text-xl font-light text-white/80 mb-12 max-w-2xl mx-auto">
						Check availability for your dates and start planning your Manhattan Beach escape
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link href={`/listing/${property.id}#booking`}>
							<Button size="lg" variant="secondary" className="text-lg px-10 py-6">
								Check Availability
							</Button>
						</Link>
						<Link href={`/listing/${property.id}`}>
							<Button
								size="lg"
								variant="outline"
								className="text-lg px-10 py-6 bg-transparent border-white text-white hover:bg-white/10"
							>
								View Full Details
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Branded Footer */}
			<footer className="bg-white border-t border-stone-200 py-12">
				<div className="container mx-auto px-6 lg:px-16 xl:px-32">
					<div className="flex flex-col md:flex-row justify-between items-center gap-6">
						<Link href="/" className="flex items-center">
							<Image
								src="/branding/logo.png"
								alt="Shell By The Shore"
								width={160}
								height={53}
								className="h-10 w-auto"
							/>
						</Link>
						<div className="flex items-center gap-8 text-sm text-stone-600">
							<Link href="/dashboard" className="hover:text-stone-900 transition-colors">
								Owner Access
							</Link>
							<span>Manhattan Beach, California</span>
							<span>© 2026</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
