import DatePickerWithRange from "@/components/date-picker-with-range"
import { Card, CardContent } from "@/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select"

interface BookingCardProps {
	pricePerNight: number
	capacity: number
	mobile?: boolean
}

export function BookingCard({
	pricePerNight,
	capacity,
	mobile = false
}: BookingCardProps) {
	return (
		<div className={mobile ? "" : "col-span-1"}>
			<Card className={`${mobile ? "border-0 shadow-none" : "sticky top-24"}`}>
				<CardContent className="p-6">
					<div className="flex items-baseline gap-1">
						<span className="text-2xl font-bold">${pricePerNight}</span>
						<span className="text-gray-500">night</span>
					</div>
					<div className="mt-4 space-y-4">
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
					</div>
					<button
						type="button"
						className="w-full bg-primary text-primary-foreground rounded-lg py-3 mt-4 font-medium"
					>
						Reserve
					</button>
				</CardContent>
			</Card>
		</div>
	)
}
