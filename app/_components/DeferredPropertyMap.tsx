"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

const PropertyMap = dynamic(
	() => import("./PropertyMap").then((module) => module.PropertyMap),
	{
		ssr: false,
		loading: () => <div className="h-full w-full bg-[#f4efe7]" aria-hidden="true" />
	}
)

type DeferredPropertyMapProps = {
	latitude: number
	longitude: number
	label?: string
}

/** Keep MapLibre off the critical path until its below-fold section is near. */
export function DeferredPropertyMap(props: DeferredPropertyMapProps) {
	const boundaryRef = useRef<HTMLDivElement>(null)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const boundary = boundaryRef.current
		if (!boundary) return
		if (!("IntersectionObserver" in window)) {
			setVisible(true)
			return
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisible(true)
					observer.disconnect()
				}
			},
			{ rootMargin: "600px 0px" }
		)
		observer.observe(boundary)
		return () => observer.disconnect()
	}, [])

	return (
		<div ref={boundaryRef} className="h-full w-full">
			{visible ? (
				<PropertyMap {...props} />
			) : (
				<div className="h-full w-full bg-[#f4efe7]" aria-label="Property location map" />
			)}
		</div>
	)
}
