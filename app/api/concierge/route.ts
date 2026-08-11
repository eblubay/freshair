import { NextResponse } from "next/server"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"

const SYSTEM_PROMPT = `You are the ShellByTheShore Local Concierge for guests staying near Manhattan Beach, California. Be concise, warm, and practical. Prioritize the curated guide areas: Manhattan Beach, Hermosa Beach, Redondo Beach, Venice, Santa Monica, Malibu, LAX, and ground transportation. Distinguish known facts from suggestions. Never claim live opening hours, reservations, traffic, event details, or availability. Mention that traffic and travel time vary when relevant. Do not invent businesses, prices, or addresses.`

export async function POST(request: Request) {
	const rateLimit = await allowDurableRateLimitedRequest("concierge", request, 10)
	if (!rateLimit.allowed) return NextResponse.json({ answer: "Too many concierge requests. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } })
	const body = (await request.json().catch(() => null)) as { message?: unknown } | null
	const message = typeof body?.message === "string" ? body.message.trim() : ""
	if (!message || message.length > 1000) return NextResponse.json({ answer: "Please send a short local-guide question." }, { status: 400 })
	if (process.env.OLLAMA_BASE_URL) {
		try {
			const response = await fetch(`${process.env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OLLAMA_MODEL ?? "llama3.2", stream: false, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: message }] }), signal: AbortSignal.timeout(20_000) })
			if (!response.ok) throw new Error("Ollama unavailable")
			const payload = await response.json() as { message?: { content?: string } }
			const answer = payload.message?.content?.trim()
			if (answer) return NextResponse.json({ answer, provider: "OLLAMA" }, { headers: { "Cache-Control": "no-store" } })
		} catch { /* fall through to configured OpenAI or deterministic guide fallback */ }
	}
	if (!process.env.OPENAI_API_KEY) return NextResponse.json({ answer: "The ShellByTheShore AI Concierge is being prepared for your stay. In the meantime, explore the curated Local Guide below for beach, dining, and day-trip ideas." })
	try {
		const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: message }], temperature: 0.5, max_tokens: 350 }) })
		if (!response.ok) throw new Error(`OpenAI ${response.status}`)
		const payload = await response.json() as { choices?: { message?: { content?: string } }[] }
		const answer = payload.choices?.[0]?.message?.content?.trim()
		return NextResponse.json({ answer: answer || "I couldn’t prepare an answer just now. Please try again shortly." })
	} catch {
		return NextResponse.json({ answer: "I’m unable to connect to the concierge right now. The Local Guide remains available for planning your day." }, { status: 503 })
	}
}
