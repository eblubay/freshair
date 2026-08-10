import { NextResponse } from "next/server"

const SYSTEM_PROMPT = `You are the ShellByTheShore Local Concierge for guests staying near Manhattan Beach, California. Be concise, warm, and practical. Prioritize the curated guide areas: Manhattan Beach, Hermosa Beach, Redondo Beach, Venice, Santa Monica, Malibu, LAX, and ground transportation. Distinguish known facts from suggestions. Never claim live opening hours, reservations, traffic, event details, or availability. Mention that traffic and travel time vary when relevant. Do not invent businesses, prices, or addresses.`

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as { message?: unknown } | null
	const message = typeof body?.message === "string" ? body.message.trim() : ""
	if (!message || message.length > 1000) return NextResponse.json({ answer: "Please send a short local-guide question." }, { status: 400 })
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
