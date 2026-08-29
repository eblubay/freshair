"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useMemo, useRef, useState } from "react"
import { GUIDE_CATEGORIES, GUIDE_POIS } from "@/app/_components/LocalGuideMap"
import type { LocalGuideCandidates, LocalGuidePlace } from "@/lib/local-guide-places"
import { rankLocalGuideDiningPlaces } from "@/lib/local-guide-ranking"

type Category = (typeof GUIDE_CATEGORIES)[number]
type CuratedPoi = (typeof GUIDE_POIS)[number]
type DisplayPoi = { id: string; name: string; category: Category; area: string; description: string; lat: number; lng: number; distanceKm: number; curated: boolean; tag?: string }

const COLOURS: Record<Category, string> = { Beaches: "#287c91", Food: "#c2683f", Coffee: "#7a5842", Breakfast: "#b7843b", Groceries: "#59765b", Parking: "#536d9d", Shopping: "#9b6a88", Activities: "#b7843b", Attractions: "#6e7d68", Airports: "#495766" }
const EL_PORTO_ORIGIN = { lat: 33.9031, lng: -118.4202 }
const DINING_CATEGORIES = new Set<Category>(["Food", "Coffee", "Breakfast"])
const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
function curatedDistanceKm(poi: Pick<CuratedPoi, "lat" | "lng">) {
	const radians = (degrees: number) => degrees * Math.PI / 180
	const dLat = radians(poi.lat - EL_PORTO_ORIGIN.lat); const dLon = radians(poi.lng - EL_PORTO_ORIGIN.lng)
	const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(EL_PORTO_ORIGIN.lat)) * Math.cos(radians(poi.lat)) * Math.sin(dLon / 2) ** 2
	return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
const asCurated = (poi: CuratedPoi): DisplayPoi => ({ ...poi, id: `curated-${slug(poi.name)}`, distanceKm: curatedDistanceKm(poi), curated: true })
const asLocal = (poi: LocalGuidePlace): DisplayPoi => ({ ...poi, tag: undefined })

export function LocalGuideMapInteractive({ candidates }: { candidates: LocalGuideCandidates }) {
	const node = useRef<HTMLDivElement>(null)
	const mapRef = useRef<import("maplibre-gl").Map | null>(null)
	const markers = useRef(new Map<string, import("maplibre-gl").Marker>())
	const [mapReady, setMapReady] = useState(false)
	const [selected, setSelected] = useState<Category | "All">("All")
	const [selectedPoiId, setSelectedPoiId] = useState<string>()
	const visible = useMemo(() => selected === "All" ? GUIDE_POIS.map(asCurated) : DINING_CATEGORIES.has(selected) ? rankLocalGuideDiningPlaces(selected as "Food" | "Coffee" | "Breakfast", candidates, GUIDE_POIS) as DisplayPoi[] : GUIDE_POIS.filter((poi) => poi.category === selected).map(asCurated), [candidates, selected])
	const grouped = useMemo(() => Object.entries(visible.reduce<Record<string, DisplayPoi[]>>((groups, poi) => { (groups[`${poi.area} · ${poi.category}`] ??= []).push(poi); return groups }, {})), [visible])

	useEffect(() => {
		let closed = false
		void import("maplibre-gl").then((module) => {
			if (closed || !node.current) return
			const maplibregl = (module as { default?: typeof module }).default ?? module
			maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.js")
			const map = new maplibregl.Map({ container: node.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [EL_PORTO_ORIGIN.lng, EL_PORTO_ORIGIN.lat], zoom: 12.5, attributionControl: { compact: true } })
			mapRef.current = map; map.once("load", () => !closed && setMapReady(true))
		})
		return () => { closed = true; markers.current.forEach((marker) => marker.remove()); markers.current.clear(); mapRef.current?.remove(); mapRef.current = null }
	}, [])

	useEffect(() => {
		if (!mapReady || !mapRef.current) return
		let cancelled = false
		void import("maplibre-gl").then((module) => {
			if (cancelled || !mapRef.current) return
			const maplibregl = (module as { default?: typeof module }).default ?? module
			markers.current.forEach((marker) => marker.remove()); markers.current.clear()
			const bounds = new maplibregl.LngLatBounds([EL_PORTO_ORIGIN.lng, EL_PORTO_ORIGIN.lat], [EL_PORTO_ORIGIN.lng, EL_PORTO_ORIGIN.lat])
			for (const poi of visible) {
				const popup = document.createElement("div"); const title = document.createElement("strong"); const area = document.createElement("small")
				title.textContent = poi.name; area.textContent = poi.area; popup.append(title, document.createElement("br"), area)
				const marker = new maplibregl.Marker({ color: COLOURS[poi.category], scale: selectedPoiId === poi.id ? 1.2 : 1 }).setLngLat([poi.lng, poi.lat]).setPopup(new maplibregl.Popup({ offset: 24 }).setDOMContent(popup)).addTo(mapRef.current)
				marker.getElement().dataset.poiId = poi.id; marker.getElement().addEventListener("click", () => setSelectedPoiId(poi.id)); markers.current.set(poi.id, marker); bounds.extend([poi.lng, poi.lat])
			}
			if (selected !== "All") mapRef.current.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 })
		})
		return () => { cancelled = true }
	}, [mapReady, selected, selectedPoiId, visible])

	const showPoi = (poi: DisplayPoi) => { setSelectedPoiId(poi.id); mapRef.current?.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(mapRef.current.getZoom(), 14), essential: true }); markers.current.get(poi.id)?.togglePopup() }

	return <section aria-labelledby="guide-map-heading" className="overflow-hidden border border-[#e6ddcf] bg-white shadow-[0_16px_45px_rgba(40,50,59,0.05)]">
		<div className="border-b border-[#e6ddcf] p-5 sm:p-8"><p className="text-[11px] uppercase tracking-[.24em] text-[#8d7c66]">Explore nearby</p><h2 id="guide-map-heading" className="mt-2 font-serif text-3xl sm:text-4xl">Local Guide map</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5d6b78]">Host-selected recommendations and useful nearby places, with Food, Coffee and Breakfast centered on the El Porto area.</p><div className="mt-5 flex gap-2 overflow-x-auto pb-2">{["All", ...GUIDE_CATEGORIES].map((category) => <button key={category} type="button" onClick={() => { setSelected(category as Category | "All"); setSelectedPoiId(undefined) }} className={`min-h-10 whitespace-nowrap border px-4 text-xs font-medium ${selected === category ? "border-[#28323b] bg-[#28323b] text-white" : "border-[#d8cdbd] bg-white text-[#5d6b78]"}`}>{category}</button>)}</div></div>
		<div ref={node} className="h-[420px] w-full sm:h-[520px]" aria-label="Map of Local Guide destinations" />
		<div className="border-t border-[#e6ddcf] p-5 sm:p-8"><div className="grid gap-7 lg:grid-cols-2">{grouped.map(([heading, pois]) => <section key={heading}><h3 className="text-[11px] uppercase tracking-[.18em] text-[#8d7c66]">{heading}</h3><div className="mt-3 grid gap-3">{pois.map((poi) => <article key={poi.id} data-poi-id={poi.id} className={`border p-4 transition ${selectedPoiId === poi.id ? "border-[#28323b] bg-[#f8f2e9]" : "border-[#e6ddcf] bg-white"}`}><div className="flex items-start justify-between gap-4"><div><h4 className="font-serif text-xl">{poi.name}</h4><p className="mt-1 text-sm leading-relaxed text-[#5d6b78]">{poi.description}</p>{poi.tag && <p className="mt-2 text-[10px] uppercase tracking-[.16em] text-[#8d7c66]">{poi.tag}</p>}</div><button type="button" onClick={() => showPoi(poi)} className="min-h-10 shrink-0 border border-[#d8cdbd] px-3 text-xs text-[#53616d]">Show on map</button></div></article>)}</div></section>)}</div></div>
		<p className="border-t border-[#e6ddcf] px-5 py-4 text-[11px] leading-relaxed text-[#7b8791] sm:px-8">Map data © OpenStreetMap contributors · OpenMapTiles · OpenFreeMap. No partnership or sponsorship is implied unless specifically stated.</p>
	</section>
}
