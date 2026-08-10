"use client"

import DatePickerWithRange from "@/components/date-picker-with-range"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createBooking } from "@/lib/bookings"
import { incrementPropertyInquiries } from "@/lib/properties"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

interface BookingCardProps {
	propertyId: string
	pricePerNight: number
	capacity: number
}

export function BookingCard({
	propertyId,
	pricePerNight,
	capacity
}: BookingCardProps) {
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [phone, setPhone] = useState("")
	const [message, setMessage] = useState("")
	const [guests, setGuests] = useState("1")
	const [dates, setDates] = useState<DateRange | undefined>()
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [submitted, setSubmitted] = useState(false)

	const handleRequestAvailability = async () => {
		// Validation
		if (!dates?.from || !dates?.to) {
			toast({
				title: "Dates Required",
				description: "Please select check-in and check-out dates.",
				variant: "destructive"
			})
			return
		}

		if (!name.trim()) {
			toast({
				title: "Name Required",
				description: "Please enter your name.",
				variant: "destructive"
			})
			return
		}

		if (!email.trim() || !email.includes("@")) {
			toast({
				title: "Valid Email Required",
				description: "Please enter a valid email address.",
				variant: "destructive"
			})
			return
		}

		setIsLoading(true)
		try {
			await createBooking({
				propertyId,
				email,
				guests: Number.parseInt(guests),
				dates,
				pricePerNight
			})

			await incrementPropertyInquiries(propertyId)

			setSubmitted(true)
			toast({
				title: "Availability Request Received!",
				description: "This is not a confirmed reservation yet. We'll confirm availability shortly.",
				duration: 6000
			})
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to send request. Please try again.",
				variant: "destructive"
			})
		} finally {
			setIsLoading(false)
		}
	}

	if (submitted) {
		return (
			<div className="col-span-1">
				<Card className="sticky top-24">
					<CardContent className="p-6">
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold mb-2">Request Received</h3>
							<p className="text-gray-600 mb-4">
								Your availability request has been received. This is not a confirmed reservation yet.
							</p>
							<p className="text-sm text-gray-500">
								We'll confirm availability and contact you at {email} shortly.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="col-span-1">
			<Card className="sticky top-24">
				<CardContent className="p-6">
					<div className="flex items-baseline gap-1 mb-6">
						<span className="text-2xl font-bold">${pricePerNight}</span>
						<span className="text-gray-500">night</span>
					</div>
					<div className="space-y-4">
						<div>
							<Label htmlFor="dates">Check-in / Check-out</Label>
							<DatePickerWithRange date={dates} onDateSelect={setDates} />
						</div>
						<div>
							<Label htmlFor="guests">Guests</Label>
							<Select defaultValue="1" onValueChange={setGuests}>
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
						<div>
							<Label htmlFor="name">Full Name *</Label>
							<Input
								id="name"
								type="text"
								placeholder="Your full name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div>
							<Label htmlFor="email">Email *</Label>
							<Input
								id="email"
								type="email"
								placeholder="your@email.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div>
							<Label htmlFor="phone">Phone (optional)</Label>
							<Input
								id="phone"
								type="tel"
								placeholder="+1 (555) 000-0000"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="message">Message (optional)</Label>
							<Textarea
								id="message"
								placeholder="Any special requests or questions?"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								rows={3}
							/>
						</div>
					</div>
					<Button
						className="w-full mt-4"
						onClick={handleRequestAvailability}
						disabled={!email || !name || !dates || isLoading}
					>
						{isLoading ? "Sending Request..." : "Request Availability"}
					</Button>
					<p className="text-xs text-gray-500 text-center mt-2">
						This is not a confirmed reservation. We'll verify availability first.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
