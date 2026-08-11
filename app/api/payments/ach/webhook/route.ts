import { settleAchPayment } from "@/lib/ach-payment-domain"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ eventId: z.string().min(8).max(255), providerReference: z.string().min(8).max(255), status: z.enum(["SETTLED", "FAILED", "RETURNED"]) })

export async function POST(request: Request) {
	const secret = process.env.ACH_PROVIDER_WEBHOOK_SECRET
	if (!secret || request.headers.get("x-ach-webhook-secret") !== secret) return NextResponse.json({ error: "Unauthorized ACH webhook." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = schema.parse(await request.json())
		const [duplicate] = await queryClient`SELECT 1 FROM processed_webhook_events WHERE provider='ACH' AND event_id=${data.eventId}`
		if (duplicate) return NextResponse.json({ received: true, duplicate: true }, { headers: { "Cache-Control": "no-store" } })
		await queryClient`INSERT INTO processed_webhook_events (provider,event_id,payload) VALUES ('ACH',${data.eventId},${JSON.stringify({ status: data.status })}::jsonb)`
		return NextResponse.json(await settleAchPayment(data.providerReference, data.status === "SETTLED"), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid ACH webhook." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
