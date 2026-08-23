"use client"

import type { PhotoView } from "@/lib/view-model"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

type PhotoGalleryProps = {
	photos: PhotoView[]
}

/**
 * Editorial gallery with a working full-screen lightbox.
 * Receives only `src` / `caption` / `portrait` — never the raw listing.
 */
export function PhotoGallery({ photos }: PhotoGalleryProps) {
	const [openIndex, setOpenIndex] = useState<number | null>(null)
	const [showAll, setShowAll] = useState(false)

	const close = useCallback(() => setOpenIndex(null), [])

	const step = useCallback(
		(delta: number) => {
			setOpenIndex((current) => {
				if (current === null) return current
				const next = (current + delta + photos.length) % photos.length
				return next
			})
		},
		[photos.length]
	)

	useEffect(() => {
		if (openIndex === null) return

		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close()
			if (event.key === "ArrowRight") step(1)
			if (event.key === "ArrowLeft") step(-1)
		}

		document.addEventListener("keydown", onKey)
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = "hidden"

		return () => {
			document.removeEventListener("keydown", onKey)
			document.body.style.overflow = previousOverflow
		}
	}, [openIndex, close, step])

	if (photos.length === 0) return null

	const visible = showAll ? photos : photos.slice(0, 9)

	return (
		<div>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
				{visible.map((photo, index) => {
					// Mosaic rhythm: first photo wide, every 7th tall.
					const wide = index === 0
					const tall = index % 7 === 3

					return (
						<button
							key={photo.src}
							type="button"
							onClick={() => setOpenIndex(index)}
							className={[
								"group relative overflow-hidden rounded-sm bg-[#efe8dd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2683f]",
								wide ? "col-span-2 row-span-2 aspect-square md:aspect-[4/3]" : "",
								tall ? "row-span-2 aspect-[3/4]" : "",
								!wide && !tall ? "aspect-[4/3]" : ""
							].join(" ")}
							aria-label={photo.caption || `Open photo ${index + 1}`}
						>
							<Image
								src={photo.src}
								alt={photo.caption || `Photo ${index + 1}`}
								fill
								sizes={wide ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
								loading="lazy"
								className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
							/>
						</button>
					)
				})}
			</div>

			{photos.length > 9 && (
				<div className="mt-8 text-center">
					<button
						type="button"
						onClick={() => setShowAll((value) => !value)}
						className="border border-[#c9bda9] px-8 py-3 text-xs uppercase tracking-[0.18em] text-[#3d4b57] transition-colors hover:border-[#3d4b57]"
					>
						{showAll ? "Show fewer photos" : `Show all ${photos.length} photos`}
					</button>
				</div>
			)}

			{openIndex !== null && (
				<div
					className="fixed inset-0 z-[100] flex flex-col bg-black/95"
					role="dialog"
					aria-modal="true"
				>
					<div className="flex items-center justify-between px-5 py-4 text-white">
						<span className="text-sm tabular-nums">
							{openIndex + 1} / {photos.length}
						</span>
						<button
							type="button"
							onClick={close}
							className="p-2 text-2xl leading-none"
							aria-label="Close gallery"
						>
							×
						</button>
					</div>

					<div className="relative flex-1">
						<Image
							src={photos[openIndex].src}
							alt={photos[openIndex].caption || `Photo ${openIndex + 1}`}
							fill
							sizes="100vw"
							className="object-contain"
							priority
						/>
					</div>

					{photos[openIndex].caption && (
						<p className="px-6 pb-2 text-center text-sm text-white/80">
							{photos[openIndex].caption}
						</p>
					)}

					<div className="flex items-center justify-center gap-6 pb-6">
						<button
							type="button"
							onClick={() => step(-1)}
							className="border border-white/40 px-6 py-2 text-xs uppercase tracking-[0.18em] text-white"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={() => step(1)}
							className="border border-white/40 px-6 py-2 text-xs uppercase tracking-[0.18em] text-white"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
