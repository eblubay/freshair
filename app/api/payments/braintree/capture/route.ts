import { BookingDomainError } from "@/lib/booking-domain"
import { captureBraintreePayment } from "@/lib/payment-domain"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	try {
		const payment = await captureBraintreePayment(await request.json())
		return NextResponse.json(payment, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unable to process payment." },
			{ status: error instanceof BookingDomainError ? error.status : 400, headers: { "Cache-Control": "no-store" } }
		)
	}
}
