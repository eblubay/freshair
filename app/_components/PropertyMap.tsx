"use client"

import { useEffect, useRef, useState } from "react"

type PropertyMapProps = {
	latitude: number
	longitude: number
	label?: string
	className?: string
}

/**
 * MapLibre GL + OpenFreeMap.
 *
 * OpenFreeMap serves *vector* style documents — the previous implementation
 * requested `.../styles/liberty/{z}/{x}/{y}.png` raster tiles, which do not
 * exist, so every tile 404'd and the map rendered as a grey box.
 */
export function PropertyMap({
	latitude,
	longitude,
	label,
	className
}: PropertyMapProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<{ remove: () => void; resize: () => void } | null>(null)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let cancelled = false
		let observer: ResizeObserver | undefined

		const container = containerRef.current
		if (!container) return
		import("maplibre-gl")
			.then((mod) => {
		if (cancelled || !containerRef.current) return

		const maplibregl = (mod as { default?: typeof mod }).default ?? mod

		// MapLibre parses vector tiles inside a module Web Worker. Bundled by
		// Next/webpack the default worker URL resolved to an HTML 404, so the
		// worker never booted: style, sprites, marker and controls appeared
		// while zero `.pbf` tiles were ever requested — the blank basemap.
		// The worker (and its shared chunk) are therefore served verbatim
		// from `public/maplibre/`.
		// Hostinger serves `.mjs` static files as `text/plain`, which browsers
		// reject for a module worker. The identical ES module files use `.js` so
		// Hostinger returns a JavaScript MIME type in production.
		maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.js")


				const map = new maplibregl.Map({
					container: containerRef.current,
					// Vector style document (no API key, free to use).
					style: "https://tiles.openfreemap.org/styles/liberty",
					center: [longitude, latitude],
					zoom: 14,
					attributionControl: { compact: true },
					cooperativeGestures: true
				})

				mapRef.current = map

				if (process.env.NODE_ENV !== "production") {
					// Handle for automated / manual map diagnostics.
					;(window as unknown as { __propertyMap?: unknown }).__propertyMap = map
				}

				map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

				const marker = new maplibregl.Marker({ color: "#c2683f" }).setLngLat([
					longitude,
					latitude
				])

				if (label) {
					marker.setPopup(new maplibregl.Popup({ offset: 24 }).setText(label))
				}

				marker.addTo(map)

				map.on("load", () => {
					// Containers that mount at zero height (tabs, accordions, grid
					// cells) leave MapLibre with a 0x0 canvas until it is told to
					// re-measure.
					map.resize()

					map.addSource("approximate-area", {
						type: "geojson",
						data: {
							type: "Feature",
							properties: {},
							geometry: { type: "Point", coordinates: [longitude, latitude] }
						}
					})

					map.addLayer({
						id: "approximate-area-fill",
						type: "circle",
						source: "approximate-area",
						paint: {
							"circle-radius": [
								"interpolate",
								["linear"],
								["zoom"],
								12,
								20,
								14,
								55,
								16,
								180
							],
							"circle-color": "#c2683f",
							"circle-opacity": 0.15,
							"circle-stroke-width": 1,
							"circle-stroke-color": "#c2683f",
							"circle-stroke-opacity": 0.4
						}
					})
				})

				map.on("error", (event: unknown) => {
					console.error("[PropertyMap] MapLibre error:", event)
				})

				if (typeof ResizeObserver !== "undefined" && containerRef.current) {
					observer = new ResizeObserver(() => map.resize())
					observer.observe(containerRef.current)
				}
			})
			.catch((error) => {
				console.error("[PropertyMap] failed to load MapLibre:", error)
				if (!cancelled) setFailed(true)
			})

		return () => {
			cancelled = true
			observer?.disconnect()
			mapRef.current?.remove()
			mapRef.current = null
		}
	}, [latitude, longitude, label])

	if (failed) {
		return (
			<div
				className={`flex h-full w-full items-center justify-center bg-[#f4efe7] text-sm text-[#7a6a58] ${className ?? ""}`}
			>
				Map unavailable
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			className={`h-full w-full ${className ?? ""}`}
			style={{ minHeight: "320px" }}
			aria-label="Property location map"
		/>
	)
}
