import { classifyUrgency } from "@/lib/host-bot"
import { queryClient } from "@/lib/db"
import { PUBLIC_GUEST_EMAIL } from "@/lib/launch-config"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ messageId: z.string().trim().min(3).max(500), from: z.string().trim().email(), subject: z.string().trim().max(500).default(""), text: z.string().max(100_000), inReplyTo: z.string().trim().max(500).optional(), references: z.string().trim().max(2000).optional(), autoSubmitted: z.string().max(100).optional(), isBounce: z.boolean().optional().default(false), isSpam: z.boolean().optional().default(false) })
const sanitize = (value: string) => value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 20_000)

export async function POST(request: Request) {
	if (!process.env.AUTOMATION_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.AUTOMATION_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 })
	const data = parsed.data; if (data.from.toLowerCase() === PUBLIC_GUEST_EMAIL || data.isBounce || data.isSpam || /auto-(replied|generated)/i.test(data.autoSubmitted ?? "")) return NextResponse.json({ accepted: false, ignored: true })
	const ref = data.subject.match(/SBS-[A-F0-9]{8}/i)?.[0]?.toUpperCase()
	const inquiryRows = data.inReplyTo ? await queryClient`SELECT id,public_reference,guest_first_name,guest_last_name FROM inquiries WHERE email_thread_message_id=${data.inReplyTo} LIMIT 1` : ref ? await queryClient`SELECT id,public_reference,guest_first_name,guest_last_name FROM inquiries WHERE public_reference=${ref} LIMIT 1` : []
	const inquiry = inquiryRows[0]; if (!inquiry) return NextResponse.json({ accepted: false, unresolved: true }, { status: 202 })
	const content = sanitize(data.text); const urgency = classifyUrgency(content)
	const inserted = await queryClient`INSERT INTO inquiry_messages (id,inquiry_id,direction,message_id,in_reply_to,references_header,subject,content_plain,received_at) VALUES (${nanoid()},${inquiry.id},'INBOUND',${data.messageId},${data.inReplyTo ?? null},${data.references ?? null},${sanitize(data.subject)},${content},now()) ON CONFLICT (message_id) DO NOTHING RETURNING id`
	if (!inserted[0]) return NextResponse.json({ accepted: true, duplicate: true })
	await queryClient`UPDATE inquiries SET status='GUEST_REPLIED',updated_at=now() WHERE id=${inquiry.id}`
	return NextResponse.json({ accepted: true, inquiryReference: inquiry.public_reference, urgency, telegramAlert: `📩 ${urgency === "HIGH" ? "HIGH PRIORITY " : ""}GUEST REPLIED\n\nRef: ${inquiry.public_reference}\nGuest: ${inquiry.guest_first_name} ${inquiry.guest_last_name}\n\n“${content.slice(0, 1000)}”` })
}
