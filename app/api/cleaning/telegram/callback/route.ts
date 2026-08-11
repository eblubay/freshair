import { createHmac, timingSafeEqual } from "crypto"
import { applyCleaningTaskAction } from "@/lib/cleaning-domain"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ taskId: z.string().min(8), action: z.enum(["CONFIRM", "STARTED", "COMPLETED", "PROBLEM"]), chatId: z.string().min(1), signature: z.string().regex(/^[a-f0-9]{64}$/) })

function expectedSignature(taskId: string, action: string, chatId: string) {
	const secret = process.env.TELEGRAM_CALLBACK_SECRET
	if (!secret) return null
	return createHmac("sha256", secret).update(`${taskId}:${action}:${chatId}`).digest("hex")
}

export async function POST(request: Request) {
	try {
		const data = schema.parse(await request.json())
		const expected = expectedSignature(data.taskId, data.action, data.chatId)
		if (!expected || !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(data.signature, "hex"))) return NextResponse.json({ error: "Invalid callback signature." }, { status: 401, headers: { "Cache-Control": "no-store" } })
		const [task] = await queryClient`SELECT t.id,c.telegram_chat_id FROM cleaning_tasks t JOIN cleaners c ON c.id=t.assigned_cleaner_id WHERE t.id=${data.taskId}`
		if (!task || task.telegram_chat_id !== data.chatId) return NextResponse.json({ error: "Cleaner is not authorized for this task." }, { status: 403, headers: { "Cache-Control": "no-store" } })
		const [duplicate] = await queryClient`SELECT 1 FROM cleaning_task_events WHERE task_id=${data.taskId} AND actor_id=${data.chatId} AND event_type=${`CLEANING_${data.action === "CONFIRM" ? "ACKNOWLEDGED" : data.action === "STARTED" ? "STARTED" : data.action === "COMPLETED" ? "COMPLETED" : "PROBLEM_REPORTED"}`} LIMIT 1`
		if (duplicate) return NextResponse.json({ accepted: true, duplicate: true }, { headers: { "Cache-Control": "no-store" } })
		return NextResponse.json(await applyCleaningTaskAction({ taskId: data.taskId, action: data.action, actorId: data.chatId, channel: "TELEGRAM" }), { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid cleaning callback." }, { status: 400, headers: { "Cache-Control": "no-store" } })
	}
}
