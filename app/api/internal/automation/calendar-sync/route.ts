import { syncEnabledExternalCalendars } from "@/lib/calendar-sync"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const secret = process.env.AUTOMATION_SECRET
	if (!secret) return NextResponse.json({ error: "Automation is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } })
	if (request.headers.get("x-automation-secret") !== secret) return NextResponse.json({ error: "Automation authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	const rate = await allowDurableRateLimitedRequest("calendar-automation", request, 4, 60_000)
	if (!rate.allowed) return NextResponse.json({ error: "Too many calendar automation runs." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } })
	try {
		return NextResponse.json(await syncEnabledExternalCalendars(), { headers: { "Cache-Control": "no-store" } })
	} catch {
		return NextResponse.json({ error: "Calendar automation failed." }, { status: 500, headers: { "Cache-Control": "no-store" } })
	}
}
