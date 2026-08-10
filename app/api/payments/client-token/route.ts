import { createClientPaymentToken } from "@/lib/payment-providers"
import { NextResponse } from "next/server"

export async function POST() {
	try {
		const token = await createClientPaymentToken()
		return NextResponse.json(token, { headers: { "Cache-Control": "no-store" } })
	} catch {
		return NextResponse.json(
			{ provider: "BRAINTREE", status: "AWAITING_CREDENTIAL", message: "Payment checkout is not configured yet." },
			{ status: 503, headers: { "Cache-Control": "no-store" } }
		)
	}
}
