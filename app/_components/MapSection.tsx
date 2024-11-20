"use client"

interface MapSectionProps {
	coordinates: {
		latitude: number
		longitude: number
	}
	radiusInMeters: number
}

export function MapSection({ coordinates, radiusInMeters }: MapSectionProps) {
	return (
		<div
			className="mt-4 rounded-lg overflow-hidden h-[400px] w-full bg-muted"
			role="img"
			aria-label={`Map showing location at ${coordinates.latitude},${coordinates.longitude}`}
		>
			{/* TODO: Implement map when we find a reliable provider */}
		</div>
	)
}
