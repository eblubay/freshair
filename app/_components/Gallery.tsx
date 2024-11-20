"use client"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface GalleryProps {
	images: {
		src: string
		caption: string | null
		aspectRatio: number
	}[]
	className?: string
}

export function Gallery({ images, className }: GalleryProps) {
	// Find best horizontal image (closest to 2:1)
	const horizontalImage = images.reduce((best, current) => {
		const targetRatio = 2
		const bestDiff = Math.abs(best.aspectRatio - targetRatio)
		const currentDiff = Math.abs(current.aspectRatio - targetRatio)
		return currentDiff < bestDiff ? current : best
	}, images[0])

	// Get remaining images, excluding the one we used for horizontal
	const remainingImages = images
		.filter((img) => img.src !== horizontalImage.src)
		.slice(0, 6)

	return (
		<div className={cn("grid grid-cols-4 gap-2", className)}>
			<div className="col-span-2">
				<AspectRatio ratio={2 / 1} className="overflow-hidden rounded-l-lg">
					<Image
						src={horizontalImage.src}
						alt={horizontalImage.caption || "Gallery image"}
						fill
						className="cursor-pointer object-cover"
					/>
				</AspectRatio>
			</div>
			{remainingImages.map((image) => (
				<AspectRatio key={image.src} ratio={1} className="overflow-hidden">
					<Image
						src={image.src}
						alt={image.caption || "Gallery image"}
						fill
						className="cursor-pointer object-cover"
					/>
				</AspectRatio>
			))}
		</div>
	)
}
