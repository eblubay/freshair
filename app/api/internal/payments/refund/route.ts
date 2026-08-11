import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { refundBraintreePayment } from "@/lib/payment-domain"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
	reservationId: z.string().min(8).max(128),
	amount: z.coerce.number().int().positive().optional(),
	reason: z.string().trim().max(500).optional()
})

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = schema.parse(await request.json())
		const [reservation] = await queryClient`
			SELECT r.id FROM reservations r
			JOIN properties p ON p.id=r.property_id
			WHERE r.id=${data.reservationId} AND p.clerk_id=${userId}
		`
		if (!reservation) return NextResponse.json({ error: "Reservation not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		return NextResponse.json(await refundBraintreePayment(data), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Refund failed." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
