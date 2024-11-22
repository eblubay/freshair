"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/components/ui/tooltip"
import type { VisualProperty } from "@/lib/properties"
import { deleteProperty, updatePropertyPrice } from "@/lib/properties"
import { motion } from "framer-motion"
import debounce from "lodash.debounce"
import { Home, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"

export function PropertyCard({ property }: { property: VisualProperty }) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [localPrice, setLocalPrice] = useState(property.pricePerNight)

	const debouncedPriceUpdate = useCallback(
		debounce((newPrice: number) => {
			startTransition(async () => {
				await updatePropertyPrice(property.id, newPrice)
				router.refresh()
			})
		}, 1000),
		[]
	)

	useEffect(() => {
		return () => {
			debouncedPriceUpdate.cancel()
		}
	}, [debouncedPriceUpdate])

	const handleDelete = (propertyId: string) => {
		startTransition(async () => {
			await deleteProperty(propertyId)
			router.refresh()
		})
	}

	return (
		<motion.div
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			transition={{ type: "spring", stiffness: 400, damping: 17 }}
		>
			<Card
				onClick={() =>
					property.status === "loaded" && router.push(`/listing/${property.id}`)
				}
				className={`${
					property.status === "loaded"
						? "cursor-pointer hover:shadow-lg transition-shadow"
						: "opacity-50"
				}`}
			>
				<CardContent className="p-6">
					<div className="flex flex-col gap-4">
						{/* Title, Location, and Top Buttons */}
						<div className="flex justify-between items-start">
							<div>
								<h3 className="font-semibold">
									{property.status === "loaded"
										? property.title
										: "Property is loading..."}
								</h3>
								<p className="text-sm text-gray-500">
									{property.status === "loaded"
										? property.location
										: "Check back soon!"}
								</p>
							</div>
							<TooltipProvider>
								<div className="flex gap-2">
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={(e) => {
													e.stopPropagation()
													window.open(property.url, "_blank")
												}}
												className="text-[#FF385C] hover:text-[#FF385C] hover:bg-[#FF385C]/10"
											>
												<Home className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Open Airbnb listing</p>
										</TooltipContent>
									</Tooltip>

									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={(e) => {
													e.stopPropagation()
													handleDelete(property.id)
												}}
												disabled={property.status === "pending" || isPending}
												className={
													property.status === "pending"
														? "opacity-50 cursor-not-allowed"
														: ""
												}
											>
												<Trash2 className="h-4 w-4 text-red-500" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Delete property</p>
										</TooltipContent>
									</Tooltip>
								</div>
							</TooltipProvider>
						</div>

						{/* Stats Grid */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm text-gray-500">Views</p>
								<p className="text-lg font-semibold">
									{property.status === "loaded" ? property.views : "—"}
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Inquiries</p>
								<p className="text-lg font-semibold">
									{property.status === "loaded" ? property.inquiries : "—"}
								</p>
							</div>
						</div>

						{/* Price Input - Now on its own line */}
						<div>
							<p className="text-sm text-gray-500">Price per night</p>
							<Input
								type="number"
								min="0"
								value={localPrice}
								onChange={(e) => {
									e.stopPropagation()
									const newPrice = Number(e.target.value)
									setLocalPrice(newPrice)
									if (!Number.isNaN(newPrice)) {
										debouncedPriceUpdate(newPrice)
									}
								}}
								onMouseDown={(e) => e.stopPropagation()}
								onClick={(e) => e.stopPropagation()}
								onFocus={(e) => e.stopPropagation()}
								className="w-full"
								disabled={property.status === "pending" || isPending}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}
