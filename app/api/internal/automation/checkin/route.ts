import { runPreArrivalAutomation } from "@/lib/pre-arrival-automation"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const secret = process.env.AUTOMATION_SECRET
	if (!secret) {
		return NextResponse.json(
			{ error: "Automation is not configured." },
			{ status: 503, headers: { "Cache-Control": "no-store" } }
		)
	}
	if (request.headers.get("x-automation-secret") !== secret) {
		return NextResponse.json(
			{ error: "Automation authentication is required." },
			{ status: 401, headers: { "Cache-Control": "no-store" } }
		)
	}

	try {
		return NextResponse.json(await runPreArrivalAutomation(), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		console.error("Pre-arrival automation failed", error)
		return NextResponse.json(
			{ error: "Pre-arrival automation failed." },
			{ status: 500, headers: { "Cache-Control": "no-store" } }
		)
	}
}
