import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ conversationId: z.string().min(1) })
export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const { conversationId } = schema.parse(await request.json())
		const [ownerProperty] = await queryClient`SELECT id FROM properties WHERE clerk_id=${userId} LIMIT 1`
		if (!ownerProperty) return NextResponse.json({ error: "Owner access is required." }, { status: 403, headers: { "Cache-Control": "no-store" } })
		const result = await queryClient`UPDATE chat_conversations SET question_count=0,ai_enabled=true,human_handoff=false,resolved_at=now(),updated_at=now() WHERE provider_conversation_id=${conversationId} RETURNING id`
		if (!result[0]) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		return NextResponse.json({ reset: true }, { headers: { "Cache-Control": "no-store" } })
	} catch {
		return NextResponse.json({ error: "Unable to reset conversation." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
