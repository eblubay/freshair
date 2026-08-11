import { getPropertyWeather } from "@/lib/weather"
import { NextResponse } from "next/server"

export async function GET() {
	const weather = await getPropertyWeather()
	return NextResponse.json(weather ?? { unavailable: true }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=900" } })
}
