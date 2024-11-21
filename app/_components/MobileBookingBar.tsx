"use client"
import DatePickerWithRange from "@/components/date-picker-with-range"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
				<DialogContent className="max-h-screen h-screen sm:max-w-[425px] p-6">
					<DialogTitle className="text-xl font-semibold mb-6">
						Reserve your stay
					</DialogTitle>
					<div className="space-y-6">
						<div className="flex items-baseline gap-1">
							<span className="text-2xl font-bold">${pricePerNight}</span>
							<span className="text-gray-500">night</span>
						</div>
						<DatePickerWithRange />
						<Select defaultValue="1">
							<SelectTrigger>
								<SelectValue placeholder="Number of guests" />
							</SelectTrigger>
							<SelectContent>
								{[...Array(capacity)].map((_, i) => {
									const guestCount = i + 1
									return (
										<SelectItem key={guestCount} value={guestCount.toString()}>
											{guestCount} {guestCount === 1 ? "guest" : "guests"}
										</SelectItem>
									)
								})}
							</SelectContent>
						</Select>
						<Button className="w-full" size="lg">
							Reserve
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
