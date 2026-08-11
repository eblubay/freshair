import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { notifyHostOfChatwootHandoff } from "@/lib/conversation-notifications"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
	event: z.string(),
	id: z.union([z.string(), z.number()]).optional(),
	conversation: z.object({ id: z.union([z.string(), z.number()]), status: z.string().optional() }).optional(),
	message_type: z.union([z.string(), z.number()]).optional(),
	private: z.boolean().optional(),
	content: z.string().optional(),
	sender: z.object({ type: z.string().optional() }).optional(),
	account: z.object({ id: z.union([z.string(), z.number()]) }).optional()
}).passthrough()

const hostRequest = (content: string) => /\b(human|host|owner|person|agent|someone|call me|speak to)\b/i.test(content)

export async function POST(request: Request) {
	const rate = await allowDurableRateLimitedRequest("chatwoot-webhook", request, 30)
	if (!rate.allowed) return NextResponse.json({ error: "Too many webhook events." }, { status: 429 })
	const secret = process.env.CHATWOOT_WEBHOOK_SECRET
	if (!secret || request.headers.get("x-shellbytheshore-webhook-secret") !== secret) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 })
	try {
		const raw = await request.json()
		const data = schema.parse(raw)
		if (data.event !== "message_created" || data.private || data.sender?.type?.toLowerCase() !== "contact" || !data.conversation?.id || !data.id) return NextResponse.json({ ignored: true })
		const eventId = String(data.id)
		const [duplicate] = await queryClient`SELECT 1 FROM integration_events WHERE provider='CHATWOOT' AND event_id=${eventId}`
		if (duplicate) return NextResponse.json({ ignored: true, duplicate: true })
		await queryClient`INSERT INTO integration_events (provider,event_id,event_type,payload,status) VALUES ('CHATWOOT',${eventId},'message_created',${JSON.stringify({ conversationId: String(data.conversation.id) })}::jsonb,'RECEIVED')`
		const conversationId = String(data.conversation.id)
		const [state] = await queryClient`INSERT INTO chat_conversations (id,provider_conversation_id,question_count,ai_enabled,human_handoff) VALUES (${nanoid()},${conversationId},0,true,false) ON CONFLICT (provider_conversation_id) DO UPDATE SET updated_at=now() RETURNING question_count,ai_enabled,human_handoff`
		const content = data.content?.trim() ?? ""
		const requiresHandoff = hostRequest(content) || Number(state.question_count) >= Number(process.env.CHATWOOT_HANDOFF_THRESHOLD ?? 5)
		if (requiresHandoff) {
			await queryClient`UPDATE chat_conversations SET ai_enabled=false,human_handoff=true,handoff_at=now(),updated_at=now() WHERE provider_conversation_id=${conversationId}`
			await queryClient`UPDATE integration_events SET status='HANDOFF' WHERE provider='CHATWOOT' AND event_id=${eventId}`
			const reason = hostRequest(content) ? "HOST_REQUEST" : "QUESTION_THRESHOLD"
			const delivery = await notifyHostOfChatwootHandoff({ conversationId, reason }).catch(() => ({ chatwoot: false, telegram: false }))
			return NextResponse.json({ handoff: true, conversationId, reason, delivery })
		}
		if (!state.ai_enabled || state.human_handoff) return NextResponse.json({ ignored: true, reason: "HUMAN_HANDOFF_ACTIVE" })
		await queryClient`UPDATE chat_conversations SET question_count=question_count+1,updated_at=now() WHERE provider_conversation_id=${conversationId}`
		await queryClient`UPDATE integration_events SET status='QUEUED' WHERE provider='CHATWOOT' AND event_id=${eventId}`
		return NextResponse.json({ queued: true, conversationId, content })
	} catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Chatwoot webhook." }, { status: 400 }) }
}
