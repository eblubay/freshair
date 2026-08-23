import { NextResponse } from "next/server"
import { answerConcierge } from "@/lib/concierge"
import { validHistory } from "@/lib/concierge-safety"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
	const rateLimit = await allowDurableRateLimitedRequest("concierge", request, 12)
	if (!rateLimit.allowed) return NextResponse.json({ answer: "Too many concierge requests. Please try again shortly.", state: "temporarily-unavailable" }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	let body: unknown
	try { body = await request.json() } catch { return NextResponse.json({ answer: "Please send a valid concierge question.", state: "safe-fallback" }, { status: 400 }) }
	if (!body || typeof body !== "object") return NextResponse.json({ answer: "Please send a valid concierge question.", state: "safe-fallback" }, { status: 400 })
	const payload = body as { message?: unknown; history?: unknown }
	const message = typeof payload.message === "string" ? payload.message.trim() : ""
	if (!message || message.length > 1000 || !validHistory(payload.history ?? [])) return NextResponse.json({ answer: "Please send a short concierge question with valid conversation context.", state: "safe-fallback" }, { status: 400 })
	const result = await answerConcierge(message, payload.history as never[] | undefined)
	return NextResponse.json({ ...result, state: result.metadata.answerType === "unknown" ? "safe-fallback" : "answered" }, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
}
