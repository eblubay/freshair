import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { encryptGuestDetail } from "@/lib/guest-access"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
	propertyId: z.string().min(1),
	doorCode: z.string().trim().max(240).nullable(),
	wifiName: z.string().trim().max(240).nullable(),
	wifiPassword: z.string().trim().max(240).nullable(),
	checkinNotes: z.string().trim().max(4000).nullable(),
	parkingNotes: z.string().trim().max(4000).nullable()
})

const encryptOptional = (value: string | null) => value ? encryptGuestDetail(value) : null

export async function PUT(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = schema.parse(await request.json())
		const [property] = await queryClient`SELECT id FROM properties WHERE id=${data.propertyId} AND clerk_id=${userId}`
		if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		await queryClient`
			INSERT INTO property_private_defaults (property_id,door_code_ciphertext,wifi_name_ciphertext,wifi_password_ciphertext,private_checkin_notes_ciphertext,parking_private_notes_ciphertext)
			VALUES (${data.propertyId},${encryptOptional(data.doorCode)},${encryptOptional(data.wifiName)},${encryptOptional(data.wifiPassword)},${encryptOptional(data.checkinNotes)},${encryptOptional(data.parkingNotes)})
			ON CONFLICT (property_id) DO UPDATE SET door_code_ciphertext=EXCLUDED.door_code_ciphertext,wifi_name_ciphertext=EXCLUDED.wifi_name_ciphertext,wifi_password_ciphertext=EXCLUDED.wifi_password_ciphertext,private_checkin_notes_ciphertext=EXCLUDED.private_checkin_notes_ciphertext,parking_private_notes_ciphertext=EXCLUDED.parking_private_notes_ciphertext,updated_at=now()
		`
		return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save private arrival defaults." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
