import { syncAirbnbShadowCalendar } from "@/lib/airbnb-shadow"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	if (!process.env.AUTOMATION_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.AUTOMATION_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	try { return NextResponse.json(await syncAirbnbShadowCalendar(), { headers: { "Cache-Control": "no-store" } }) }
	catch { return NextResponse.json({ error: "Airbnb calendar sync failed" }, { status: 502, headers: { "Cache-Control": "no-store" } }) }
}
