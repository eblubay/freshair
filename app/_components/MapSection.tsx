"use client"

import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useEffect, useRef } from "react"

interface MapSectionProps {
	coordinates: {
		latitude: number
		longitude: number
	}
	radiusInMeters: number
}

export function MapSection({ coordinates, radiusInMeters }: MapSectionProps) {
	const mapContainer = useRef<HTMLDivElement>(null)
	const map = useRef<mapboxgl.Map | null>(null)

	useEffect(() => {
		// Initialize the map only once
		if (map.current) return

		// Check if the map container exists
		if (!mapContainer.current) return

		// Replace with your Mapbox access token
		mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: "mapbox://styles/mapbox/streets-v12",
			center: [coordinates.longitude, coordinates.latitude],
			zoom: 13
		})

		// Disable scroll zoom
		map.current.scrollZoom.disable()

		// Add a marker at the specified coordinates
		new mapboxgl.Marker()
			.setLngLat([coordinates.longitude, coordinates.latitude])
			.addTo(map.current)

		// Add a circle to show the radius
		map.current.on("load", () => {
			map.current?.addSource("radius", {
				type: "geojson",
				data: {
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [coordinates.longitude, coordinates.latitude]
					},
					properties: {}
				}
			})

			map.current?.addLayer({
				id: "radius-circle",
				type: "circle",
				source: "radius",
				paint: {
					"circle-radius": {
						stops: [
							[0, 0],
							[20, radiusInMeters / 0.075] // Approximate pixel conversion
						],
						base: 2
					},
					"circle-color": "#007cbf",
					"circle-opacity": 0.2
				}
			})
		})

		// Cleanup
		return () => {
			map.current?.remove()
		}
	}, [coordinates, radiusInMeters])

	return (
		<div
			ref={mapContainer}
			className="mt-4 rounded-lg overflow-hidden h-[400px] w-full bg-muted"
			role="img"
			aria-label={`Map showing location at ${coordinates.latitude},${coordinates.longitude}`}
		/>
	)
}
