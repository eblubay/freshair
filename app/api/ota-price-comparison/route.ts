import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ propertyId: z.string().min(1), checkIn: z.string().date(), checkOut: z.string().date(), guests: z.coerce.number().int().min(1).max(16), currency: z.string().length(3).transform((value) => value.toUpperCase()), directTotal: z.coerce.number().int().min(0) })

export async function POST(request: Request) {
	try {
		const data = schema.parse(await request.json())
		const [observation] = await queryClient`
			SELECT provider,total_amount,observed_at::text FROM ota_price_observations
			WHERE property_id=${data.propertyId} AND check_in=${data.checkIn}::date AND check_out=${data.checkOut}::date
				AND guests=${data.guests} AND currency=${data.currency} AND observed_at >= now() - interval '7 days'
			ORDER BY observed_at DESC LIMIT 1
		`
		if (!observation || Number(observation.total_amount) <= data.directTotal) return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } })
		return NextResponse.json({ available: true, provider: observation.provider, otaTotal: Number(observation.total_amount), directTotal: data.directTotal, savings: Number(observation.total_amount) - data.directTotal, observedAt: observation.observed_at }, { headers: { "Cache-Control": "no-store" } })
	} catch {
		return NextResponse.json({ available: false }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
