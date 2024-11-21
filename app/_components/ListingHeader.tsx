interface ListingHeaderProps {
	overview: {
		propertyType: string
		location: string
		capacity: number
	}
	details: string[]
}

export function ListingHeader({ overview, details }: ListingHeaderProps) {
	return (
		<div>
			<h2 className="text-2xl font-medium">
				{overview.propertyType} in {overview.location}
			</h2>
			<h3 className="mt-1 text-base text-gray-500">
				{details.join(" · ")} · {overview.capacity} guests
			</h3>
		</div>
	)
}
