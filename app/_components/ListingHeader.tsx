interface ListingHeaderProps {
	overview: {
		propertyType: string
		title: string
		location: string
		capacity: number
	}
}

export function ListingHeader({ overview }: ListingHeaderProps) {
	const [mainTitle, ...details] = overview.title.split(" · ")

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
