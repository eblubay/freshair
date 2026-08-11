import { auth } from "@clerk/nextjs/server"
import { refundBraintreePayment } from "@/lib/payment-domain"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try { return NextResponse.json(await refundBraintreePayment(await request.json()), { headers: { "Cache-Control": "no-store" } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Refund failed." }, { status: 400, headers: { "Cache-Control": "no-store" } }) }
}
