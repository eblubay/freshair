"use server"

import { getHostEmailAddress } from "@/lib/clerk"
import { FROM_EMAIL, transporter } from "@/lib/postmark"
import type { DateRange } from "react-day-picker"

interface BookingData {
	propertyId: string
	email: string
	guests: number
	dates: DateRange
	pricePerNight: number
}

export async function createBooking(data: BookingData) {
	const hostEmail = await getHostEmailAddress(data.propertyId)

	// Send email to host using SMTP
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: hostEmail,
		subject: "New Booking Request",
		text: `
            New booking request:
            Guest Email: ${data.email}
            Guests: ${data.guests}
            Dates: ${data.dates.from?.toLocaleDateString()} - ${data.dates.to?.toLocaleDateString()}
            Price per night: $${data.pricePerNight}
        `
	})
}
