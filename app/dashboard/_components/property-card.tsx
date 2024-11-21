"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/components/ui/tooltip"
import type { VisualProperty } from "@/lib/properties"
import { deleteProperty } from "@/lib/properties"
import { Home, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

export function PropertyCard({ property }: { property: VisualProperty }) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	const handleDelete = (propertyId: string) => {
		startTransition(async () => {
			await deleteProperty(propertyId)
			router.refresh()
		})
	}

	return (
		<Card
			onClick={() => property.id && router.push(`/listing/${property.id}`)}
			className={`${
				property.id
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
								{property.name ?? "Property is loading..."}
							</h3>
							<p className="text-sm text-gray-500">
								{property.location ?? "Check back soon!"}
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
												property.id && handleDelete(property.id)
											}}
											disabled={!property.id || isPending}
											className={
												!property.id ? "opacity-50 cursor-not-allowed" : ""
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
							<p className="text-sm text-gray-500">Views (30 days)</p>
							<p className="text-lg font-semibold">{property.views ?? "—"}</p>
						</div>
						<div>
							<p className="text-sm text-gray-500">Bookings</p>
							<p className="text-lg font-semibold">
								{property.bookings ?? "—"}
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
