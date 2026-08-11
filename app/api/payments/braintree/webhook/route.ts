import { getBraintreeGateway } from "@/lib/payment-providers"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"

const eventTypeByKind: Record<string, string> = {
	transaction_settled: "SETTLED",
	transaction_settlement_declined: "SETTLEMENT_FAILED",
	transaction_disbursed: "SETTLED",
	dispute_opened: "DISPUTED",
	dispute_lost: "DISPUTED"
}

export async function POST(request: Request) {
	try {
		const data = await request.formData()
		const signature = data.get("bt_signature")
		const payload = data.get("bt_payload")
		if (typeof signature !== "string" || typeof payload !== "string") return NextResponse.json({ error: "Missing Braintree webhook payload." }, { status: 400 })
		const notification = await getBraintreeGateway().webhookNotification.parse(signature, payload)
		const transaction = "transaction" in notification ? notification.transaction : undefined
		const dispute = "dispute" in notification ? notification.dispute : undefined
		const eventId = notification.timestamp + ":" + notification.kind + ":" + (transaction?.id ?? dispute?.id ?? "none")
		const [duplicate] = await queryClient`SELECT 1 FROM processed_webhook_events WHERE provider='BRAINTREE' AND event_id=${eventId}`
		if (duplicate) return NextResponse.json({ received: true, duplicate: true })
		await queryClient.begin(async (tx) => {
			await tx`INSERT INTO processed_webhook_events (provider,event_id,payload) VALUES ('BRAINTREE',${eventId},${JSON.stringify({ kind: notification.kind })}::jsonb)`
			const transactionId = transaction?.id
			if (!transactionId) return
			const status = eventTypeByKind[notification.kind] ?? transaction?.status
			await tx`UPDATE payments SET provider_status=${transaction?.status ?? null},status=CASE WHEN ${status}='SETTLED' THEN 'SETTLED' WHEN ${status}='SETTLEMENT_FAILED' THEN 'FAILED' WHEN ${status}='DISPUTED' THEN 'DISPUTED' ELSE status END,updated_at=now() WHERE provider='BRAINTREE' AND provider_transaction_id=${transactionId}`
			if (status === "SETTLEMENT_FAILED") await tx`UPDATE reservations SET payment_status='FAILED',updated_at=now() WHERE provider_transaction_id=${transactionId}`
		})
		return NextResponse.json({ received: true })
	} catch { return NextResponse.json({ error: "Invalid Braintree webhook." }, { status: 400 }) }
}
