"use client"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Card, CardContent } from "@/components/ui/card"
import type { ExploreProperty } from "@/lib/properties"
import { motion } from "framer-motion"
import { MapPin, Star, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function PropertyCard({ property }: { property: ExploreProperty }) {
	return (
		<motion.div
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			transition={{ type: "spring", stiffness: 400, damping: 17 }}
		>
			<Link href={`/listing/${property.id}`}>
				<Card className="overflow-hidden">
					<AspectRatio ratio={16 / 9}>
						<Image
							src={property.mainImage}
							alt={property.title}
							fill
							className="object-cover"
						/>
					</AspectRatio>
					<CardContent className="p-6">
						<div className="flex items-start justify-between">
							<h3 className="font-semibold line-clamp-1">{property.title}</h3>
							{property.rating && (
								<div className="flex items-center gap-1 text-sm">
									<Star className="h-4 w-4 fill-primary text-primary" />
									<span>{property.rating}</span>
								</div>
							)}
						</div>
						<div className="mt-2 flex items-center text-gray-500 text-sm">
							<MapPin className="h-4 w-4 mr-1" />
							<span className="line-clamp-1">{property.location}</span>
						</div>
						<div className="mt-4 flex items-center justify-between text-sm">
							<div className="flex items-center gap-1 text-gray-600">
								<Users className="h-4 w-4" />
								<span>Up to {property.capacity} guests</span>
							</div>
							<div className="font-semibold">
								${property.pricePerNight}{" "}
								<span className="text-gray-500">night</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</Link>
		</motion.div>
	)
}
