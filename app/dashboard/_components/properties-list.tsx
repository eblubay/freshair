// This is a Server Component (no 'use client' directive)
import { getProperties } from "@/lib/db"
import { PropertyCard } from "./property-card"

export async function PropertiesList() {
	const properties = await getProperties()

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{properties.map((property) => (
				<PropertyCard key={property.id} property={property} />
			))}
		</div>
	)
}
