"use client"

import { useEffect, useRef } from "react"
import type { ConciergeMapPayload } from "@/lib/local-places-types"
import type { Map as MapLibreMap } from "maplibre-gl"

export function ConciergeMap({ payload }: { payload: ConciergeMapPayload }) {
	const node = useRef<HTMLDivElement>(null)
	useEffect(() => {
		if (!node.current || !payload.destinations.length) return
		let closed = false; let map: MapLibreMap | undefined
		void import("maplibre-gl").then((module) => {
			if (closed || !node.current) return
			const maplibregl = (module as { default?: typeof module }).default ?? module
			maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.js")
			const selected = payload.destinations.find((item) => item.id === payload.selectedDestinationId) ?? payload.destinations[0]
			map = new maplibregl.Map({ container: node.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [selected.longitude, selected.latitude], zoom: payload.destinations.length === 1 ? 14 : 10.5, attributionControl: { compact: true } })
			const bounds = new maplibregl.LngLatBounds()
			for (const destination of payload.destinations) {
				bounds.extend([destination.longitude, destination.latitude])
				const address = destination.address ? `<br/><small>${destination.address.replace(/[<>&"']/g, "")}</small>` : ""
				new maplibregl.Marker({ color: destination.id === selected.id ? "#c2683f" : destination.curated ? "#8f4f35" : "#287c91", scale: destination.id === selected.id ? 1.15 : 0.9 }).setLngLat([destination.longitude, destination.latitude]).setPopup(new maplibregl.Popup({ offset: 24 }).setHTML(`<strong>${destination.name.replace(/[<>&"']/g, "")}</strong>${address}`)).addTo(map)
			}
			if (payload.showGeneralOrigin) {
				const origin: [number, number] = [-118.4202, 33.9031]; bounds.extend(origin)
				new maplibregl.Marker({ color: "#28323b", scale: 0.75 }).setLngLat(origin).setPopup(new maplibregl.Popup({ offset: 20 }).setText("ShellByTheShore · El Porto area")).addTo(map)
			}
			if (payload.destinations.length > 1 || payload.showGeneralOrigin) map.once("load", () => map && map.fitBounds(bounds, { padding: 42, maxZoom: 14, duration: 0 }))
		})
		return () => { closed = true; map?.remove() }
	}, [payload])
	return <div className="mt-3 overflow-hidden border border-[#d8cdba] bg-[#f6f1e8]"><div ref={node} className="h-64 w-full" aria-label="ShellByTheShore map with recommended destinations"/><p className="px-3 py-2 text-[10px] text-[#6d665d]">{payload.attribution} · Straight-line proximity only; no turn-by-turn route is shown.</p></div>
}
