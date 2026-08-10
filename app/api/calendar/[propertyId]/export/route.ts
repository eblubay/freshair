import { queryClient } from "@/lib/db"
import { createHash } from "crypto"
import { NextResponse } from "next/server"

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

export async function GET(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
	const secret = new URL(request.url).searchParams.get("token")
	if (!process.env.ICAL_EXPORT_SECRET || !secret || createHash("sha256").update(secret).digest("hex") !== createHash("sha256").update(process.env.ICAL_EXPORT_SECRET).digest("hex")) {
		return new NextResponse("Not found", { status: 404 })
	}
	const { propertyId } = await params
	const rows = await queryClient<{ id: string; check_in: string; check_out: string; booking_source: string }[]>`
		SELECT id,check_in::text,check_out::text,booking_source FROM reservations
		WHERE property_id=${propertyId} AND booking_status IN ('HOLD','CONFIRMED','COMPLETED') AND check_out >= current_date
		ORDER BY check_in ASC
	`
	const now = new Date().toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
	const events = rows.map((row) => [
		"BEGIN:VEVENT",
		`UID:${escapeIcs(`shellbytheshore-${row.id}`)}`,
		`DTSTAMP:${now}`,
		`DTSTART;VALUE=DATE:${row.check_in.replaceAll("-", "")}`,
		`DTEND;VALUE=DATE:${row.check_out.replaceAll("-", "")}`,
		`SUMMARY:${escapeIcs(`Unavailable (${row.booking_source})`)}`,
		"TRANSP:OPAQUE",
		"END:VEVENT"
	].join("\r\n"))
	const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ShellByTheShore//Availability//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join("\r\n")
	return new NextResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="shellbytheshore-${propertyId}.ics"` } })
}
