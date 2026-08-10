"use client"

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
	const map = useRef<any>(null)

	useEffect(() => {
		// Initialize the map only once
		if (map.current) return

		// Check if the map container exists
		if (!mapContainer.current) return

		// Dynamic import of maplibre-gl to avoid SSR issues
		import("maplibre-gl").then((maplibregl) => {
			// Use OpenFreeMap tiles (no API key required)
			map.current = new maplibregl.Map({
				container: mapContainer.current!,
				style: {
					version: 8,
					sources: {
						osm: {
							type: "raster",
							tiles: ["https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png"],
							tileSize: 256,
							attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						}
					},
					layers: [
						{
							id: "osm",
							type: "raster",
							source: "osm",
							minzoom: 0,
							maxzoom: 19
						}
					]
				},
				center: [coordinates.longitude, coordinates.latitude],
				zoom: 13
			})

			// Disable scroll zoom
			map.current.scrollZoom.disable()

			// Add a marker at the specified coordinates
			new maplibregl.Marker()
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
						"circle-radius": [
							"interpolate",
							["exponential", 2],
							["zoom"],
							0, 0,
							20, radiusInMeters / 0.075
						],
						"circle-color": "#007cbf",
						"circle-opacity": 0.2
					}
				})
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
