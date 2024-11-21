import { Navbar } from "@/app/_components/Navbar"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { type ExploreProperty, getExploreProperties } from "@/lib/properties"
import { MapPin, Star, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

function PropertyCard({ property }: { property: ExploreProperty }) {
	return (
		<Link href={`/listing/${property.id}`}>
			<Card className="overflow-hidden hover:shadow-lg transition-all">
				<AspectRatio ratio={4 / 3}>
					<Image
						src={property.mainImage}
						alt={property.title}
						fill
						className="object-cover"
					/>
				</AspectRatio>
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<h3 className="font-semibold line-clamp-1">{property.title}</h3>
						{property.rating && (
							<div className="flex items-center gap-1 text-sm">
								<Star className="h-4 w-4 fill-primary text-primary" />
								<span>{property.rating}</span>
							</div>
						)}
					</div>
					<div className="mt-2 flex items-center text-gray-500 text-sm">
						<MapPin className="h-4 w-4 mr-1" />
						<span className="line-clamp-1">{property.location}</span>
					</div>
					<div className="mt-4 flex items-center justify-between text-sm">
						<div className="flex items-center gap-1 text-gray-600">
							<Users className="h-4 w-4" />
							<span>Up to {property.capacity} guests</span>
						</div>
						<div className="font-semibold">
							${property.pricePerNight}{" "}
							<span className="text-gray-500">night</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	)
}

function ExploreLoading() {
	const skeletonIds = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6", "sk7", "sk8"]

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{skeletonIds.map((id) => (
				<Card key={id} className="overflow-hidden">
					<AspectRatio ratio={4 / 3}>
						<Skeleton className="w-full h-full" />
					</AspectRatio>
					<CardContent className="p-4">
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-4 w-1/2 mt-2" />
						<div className="mt-4 flex justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-16" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export default async function ExplorePage() {
	return (
		<div>
			<Navbar />
			<main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
				{/* Hero Section */}
				<section className="py-12">
					<h1 className="text-4xl font-bold">Explore Properties</h1>
					<p className="mt-2 text-xl text-gray-600">
						Discover unique homes and experiences across our platform
					</p>
				</section>

				{/* Properties Grid */}
				<section className="py-8">
					<Suspense fallback={<ExploreLoading />}>
						<PropertiesGrid />
					</Suspense>
				</section>
			</main>
		</div>
	)
}

async function PropertiesGrid() {
	const properties = await getExploreProperties()

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{properties.map((property) => (
				<PropertyCard key={property.id} property={property} />
			))}
		</div>
	)
}
