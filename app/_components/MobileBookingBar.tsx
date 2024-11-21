"use client"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { BookingCard } from "./BookingCard"

interface MobileBookingBarProps {
	pricePerNight: number
	className?: string
	capacity: number
}

export function MobileBookingBar({
	pricePerNight,
	className,
	capacity
}: MobileBookingBarProps) {
	return (
		<div
			className={cn(
				"fixed bottom-0 left-0 right-0 border-t bg-background p-4 flex items-center justify-between",
				className
			)}
		>
			<div className="flex items-baseline gap-1">
				<span className="text-2xl font-semibold">${pricePerNight}</span>
				<span className="text-base text-muted-foreground">per night</span>
			</div>

			<Dialog>
				<DialogTrigger asChild>
					<Button size="lg">Reserve</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogTitle className="sr-only">Booking Details</DialogTitle>
					{/* We'll reuse the BookingCard content here */}
					<div className="p-4">
						<BookingCard
							pricePerNight={pricePerNight}
							capacity={capacity}
							mobile={true}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
