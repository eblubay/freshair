import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ propertyId: z.string().min(1), provider: z.enum(["AIRBNB", "BOOKING_COM", "OTHER_OTA"]), checkIn: z.string().date(), checkOut: z.string().date(), guests: z.coerce.number().int().min(1).max(16), currency: z.string().length(3).transform((value) => value.toUpperCase()), totalAmount: z.coerce.number().int().min(0), observedAt: z.string().datetime(), notes: z.string().trim().max(1000).optional() })

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = schema.parse(await request.json())
		if (data.checkOut <= data.checkIn) return NextResponse.json({ error: "Check-out must be after check-in." }, { status: 400, headers: { "Cache-Control": "no-store" } })
		const [property] = await queryClient`SELECT id FROM properties WHERE id=${data.propertyId} AND clerk_id=${userId}`
		if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		await queryClient`INSERT INTO ota_price_observations (id,property_id,provider,check_in,check_out,guests,currency,total_amount,observed_at,observed_by,notes) VALUES (${nanoid()},${data.propertyId},${data.provider},${data.checkIn}::date,${data.checkOut}::date,${data.guests},${data.currency},${data.totalAmount},${data.observedAt}::timestamptz,${userId},${data.notes ?? null})`
		return NextResponse.json({ created: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save verified OTA price." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
