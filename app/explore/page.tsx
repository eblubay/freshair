import { Navbar } from "@/app/_components/Navbar"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getExploreProperties } from "@/lib/properties"
import { Suspense } from "react"
import { PropertyCard } from "./_components/PropertyCard"

export const dynamic = "force-dynamic"

function ExploreLoading() {
	const skeletonIds = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"]

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			{skeletonIds.map((id) => (
				<Card key={id} className="overflow-hidden">
					<AspectRatio ratio={16 / 9}>
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
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			{properties.map((property) => (
				<PropertyCard key={property.id} property={property} />
			))}
		</div>
	)
}
