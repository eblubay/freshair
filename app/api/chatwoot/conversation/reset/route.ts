import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ conversationId: z.string().min(1) })
export async function POST(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401 })
	try { const { conversationId } = schema.parse(await request.json()); await queryClient`UPDATE chat_conversations SET question_count=0,ai_enabled=true,human_handoff=false,resolved_at=now(),updated_at=now() WHERE provider_conversation_id=${conversationId}`; return NextResponse.json({ reset: true }) } catch { return NextResponse.json({ error: "Unable to reset conversation." }, { status: 400 }) }
}
