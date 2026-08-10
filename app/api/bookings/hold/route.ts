import { BookingDomainError, createHold } from "@/lib/booking-domain"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
	quoteInput: z.unknown(),
	guest: z.object({ firstName: z.string().trim().min(1), lastName: z.string().trim().min(1), email: z.string().email(), phone: z.string().max(40).optional() }),
	clientRequestId: z.string().uuid()
})

export async function POST(request: Request) {
	try {
		const data = schema.parse(await request.json())
		return NextResponse.json(await createHold(data.quoteInput, data.guest, data.clientRequestId), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to hold dates." }, { status: error instanceof BookingDomainError ? error.status : 400 })
	}
}
