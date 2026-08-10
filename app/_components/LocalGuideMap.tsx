"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useMemo, useRef, useState } from "react"

export const GUIDE_CATEGORIES = [
	"Beaches",
	"Food",
	"Coffee",
	"Groceries",
	"Parking",
	"Shopping",
	"Activities",
	"Attractions",
	"Airports"
] as const

type Category = (typeof GUIDE_CATEGORIES)[number]
type Poi = { name: string; category: Category; area: string; description: string; lat: number; lng: number }

export const GUIDE_POIS: Poi[] = [
	{ name: "Manhattan Beach", category: "Beaches", area: "Manhattan Beach", description: "Wide sand, volleyball courts, and an easy place to settle in for the day.", lat: 33.8847, lng: -118.4109 },
	{ name: "Manhattan Beach Pier", category: "Attractions", area: "Manhattan Beach", description: "A classic walk over the Pacific from the heart of downtown.", lat: 33.8844, lng: -118.4114 },
	{ name: "The Strand", category: "Activities", area: "South Bay", description: "The oceanfront path for strolling, running, cycling, and people-watching.", lat: 33.8905, lng: -118.4148 },
	{ name: "Manhattan Village", category: "Shopping", area: "Manhattan Beach", description: "An open-air shopping destination with a range of stores and dining.", lat: 33.8792, lng: -118.395 },
	{ name: "Manhattan Beach Farmers Market", category: "Food", area: "Manhattan Beach", description: "A local market held weekly in downtown Manhattan Beach.", lat: 33.8849, lng: -118.4101 },
	{ name: "Two Guns Espresso", category: "Coffee", area: "Manhattan Beach", description: "A well-known local coffee stop near the beach.", lat: 33.9031, lng: -118.4201 },
	{ name: "Bristol Farms", category: "Groceries", area: "Manhattan Beach", description: "A full-service grocery option for stocking the kitchen.", lat: 33.8838, lng: -118.4048 },
	{ name: "Manhattan Beach Public Parking", category: "Parking", area: "Manhattan Beach", description: "Public beach-area parking; check posted rules and availability on arrival.", lat: 33.884, lng: -118.4125 },
	{ name: "Hermosa Beach Pier", category: "Attractions", area: "Hermosa Beach", description: "A relaxed pier and beach hub with nearby dining and nightlife.", lat: 33.8621, lng: -118.4008 },
	{ name: "Redondo Beach Pier", category: "Attractions", area: "Redondo Beach", description: "Waterfront promenades, pier views, and access to the marina area.", lat: 33.8367, lng: -118.3914 },
	{ name: "Venice Beach Boardwalk", category: "Activities", area: "Venice", description: "The lively oceanfront promenade for a distinctly Venice walk.", lat: 33.985, lng: -118.4695 },
	{ name: "Venice Canals", category: "Attractions", area: "Venice", description: "A quiet residential canal walk a short distance from the beach.", lat: 33.984, lng: -118.4651 },
	{ name: "Abbot Kinney Boulevard", category: "Shopping", area: "Venice", description: "Independent shops, galleries, coffee, and dining along a walkable corridor.", lat: 33.9918, lng: -118.4662 },
	{ name: "Santa Monica Pier", category: "Attractions", area: "Santa Monica", description: "A landmark Pacific stop with beach access and ocean views.", lat: 34.0099, lng: -118.4962 },
	{ name: "Third Street Promenade", category: "Shopping", area: "Santa Monica", description: "A pedestrian-oriented downtown shopping and walking area.", lat: 34.0172, lng: -118.4975 },
	{ name: "Malibu Surfrider Beach", category: "Beaches", area: "Malibu", description: "An iconic Malibu shoreline beside the pier and historic lagoon area.", lat: 34.0356, lng: -118.677 },
	{ name: "Malibu Pier", category: "Attractions", area: "Malibu", description: "A scenic stop for Pacific views and a stroll over the water.", lat: 34.0362, lng: -118.6777 },
	{ name: "Los Angeles International Airport", category: "Airports", area: "LAX", description: "The closest major airport for most ShellByTheShore guests.", lat: 33.9416, lng: -118.4085 }
]

const COLOURS: Record<Category, string> = { Beaches: "#287c91", Food: "#c2683f", Coffee: "#7a5842", Groceries: "#59765b", Parking: "#536d9d", Shopping: "#9b6a88", Activities: "#b7843b", Attractions: "#6e7d68", Airports: "#495766" }

export function LocalGuideMap() {
	const node = useRef<HTMLDivElement>(null)
	const mapRef = useRef<{ remove(): void; fitBounds(bounds: unknown, options?: unknown): void } | null>(null)
	const markers = useRef<{ remove(): void }[]>([])
	const [selected, setSelected] = useState<Category | "All">("All")
	const visible = useMemo(() => selected === "All" ? GUIDE_POIS : GUIDE_POIS.filter((poi) => poi.category === selected), [selected])

	useEffect(() => {
		let closed = false
		void import("maplibre-gl").then((module) => {
			if (closed || !node.current) return
			const maplibregl = (module as { default?: typeof module }).default ?? module
			maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.js")
			const map = new maplibregl.Map({ container: node.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [-118.43, 33.94], zoom: 10.5, attributionControl: { compact: true } })
			map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
			mapRef.current = map
		})
		return () => { closed = true; markers.current.forEach((marker) => marker.remove()); mapRef.current?.remove(); mapRef.current = null }
	}, [])

	useEffect(() => {
		void import("maplibre-gl").then((module) => {
			if (!mapRef.current) return
			const maplibregl = (module as { default?: typeof module }).default ?? module
			markers.current.forEach((marker) => marker.remove())
			markers.current = visible.map((poi) => new maplibregl.Marker({ color: COLOURS[poi.category] }).setLngLat([poi.lng, poi.lat]).setPopup(new maplibregl.Popup({ offset: 24 }).setHTML(`<strong>${poi.name}</strong><br/><span>${poi.area}</span><br/><small>${poi.description}</small>`)).addTo(mapRef.current as never))
		})
	}, [visible])

	return <section aria-labelledby="guide-map-heading" className="overflow-hidden border border-[#e6ddcf] bg-white shadow-[0_16px_45px_rgba(40,50,59,0.05)]"><div className="border-b border-[#e6ddcf] p-5 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] uppercase tracking-[.24em] text-[#8d7c66]">Explore nearby</p><h2 id="guide-map-heading" className="mt-2 font-serif text-3xl sm:text-4xl">The local map</h2></div><div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">{(["All", ...GUIDE_CATEGORIES] as const).map((category) => <button key={category} type="button" onClick={() => setSelected(category)} className={`shrink-0 border px-3 py-2.5 text-[11px] uppercase tracking-[.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2683f] ${selected === category ? "border-[#28323b] bg-[#28323b] text-white" : "border-[#d8cdba] bg-white text-[#3d4b57] hover:border-[#28323b]"}`}>{category}</button>)}</div></div></div><div ref={node} className="h-[330px] w-full bg-[#f8f4f0] sm:h-[430px]" aria-label="Interactive local guide map"/><div className="grid gap-x-8 gap-y-0 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">{visible.map((poi) => <article key={poi.name} className="border-b border-[#e6ddcf] py-5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0"><p className="text-[11px] uppercase tracking-[.14em]" style={{ color: COLOURS[poi.category] }}>{poi.category} · {poi.area}</p><h3 className="mt-2 font-serif text-xl">{poi.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#5d6b78]">{poi.description}</p><a className="mt-4 inline-flex min-h-10 items-center text-[11px] uppercase tracking-[.16em] text-[#3d4b57] underline decoration-[#c2683f] decoration-1 underline-offset-4 transition-colors hover:text-[#c2683f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c2683f]" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + " " + poi.area + " California")}`}>Directions <span className="ml-1" aria-hidden="true">↗</span></a></article>)}</div></section>
}
