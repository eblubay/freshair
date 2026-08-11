import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"

const createSchema = z.object({ propertyId: z.string().min(1), provider: z.enum(["AIRBNB", "BOOKING_COM", "OTHER_OTA"]), displayName: z.string().trim().min(1).max(80), url: z.string().url().max(2048), enabled: z.boolean().default(true) })
const updateSchema = z.object({ calendarId: z.string().min(8), enabled: z.boolean().optional(), displayName: z.string().trim().min(1).max(80).optional(), url: z.string().url().max(2048).optional() })

async function ownsProperty(propertyId: string, userId: string) {
	const [property] = await queryClient`SELECT id FROM properties WHERE id=${propertyId} AND clerk_id=${userId}`
	return Boolean(property)
}

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = createSchema.parse(await request.json())
		if (!await ownsProperty(data.propertyId, userId)) return NextResponse.json({ error: "Property not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		const id = nanoid()
		await queryClient`INSERT INTO external_calendars (id,property_id,provider,display_name,url,enabled,last_sync_status) VALUES (${id},${data.propertyId},${data.provider},${data.displayName},${data.url},${data.enabled},'NOT_SYNCED')`
		return NextResponse.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } })
	} catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save calendar." }, { status: 400, headers: { "Cache-Control": "no-store" } }) }
}

export async function PATCH(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = updateSchema.parse(await request.json())
		const [calendar] = await queryClient`SELECT c.id FROM external_calendars c JOIN properties p ON p.id=c.property_id WHERE c.id=${data.calendarId} AND p.clerk_id=${userId}`
		if (!calendar) return NextResponse.json({ error: "Calendar not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		await queryClient`UPDATE external_calendars SET enabled=COALESCE(${data.enabled ?? null},enabled),display_name=COALESCE(${data.displayName ?? null},display_name),url=COALESCE(${data.url ?? null},url) WHERE id=${data.calendarId}`
		return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } })
	} catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update calendar." }, { status: 400, headers: { "Cache-Control": "no-store" } }) }
}
