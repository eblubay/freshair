import "server-only"

import { getAirbnbAdvisory } from "@/lib/airbnb-shadow"
import { recalculateCleaningForReservationChange } from "@/lib/cleaning-domain"
import { queryClient } from "@/lib/db"
import { PUBLIC_GUEST_EMAIL } from "@/lib/launch-config"
import { getFromEmail, getTransporter, isSmtpConfigured } from "@/lib/postmark"
import { authorizedHost, classifyUrgency, dollarsToMinor, hostActions, replyPreview } from "@/lib/host-bot-utils"
import { nanoid } from "nanoid"
import { z } from "zod"

const actionSchema = z.object({ updateId: z.string().min(1).max(100), chatId: z.string().min(1).max(100), inquiryId: z.string().min(1).max(100).optional(), shadowEventId: z.string().min(1).max(100).optional(), action: z.enum(hostActions), text: z.string().trim().max(5000).optional(), actorId: z.string().trim().max(100).optional() })
const comparison = (advisory: string, decision: string) => advisory === "UNKNOWN_STALE" ? "STALE" : (advisory === "APPEARS_AVAILABLE") === (decision === "OWNER_VERIFIED_AVAILABLE") ? "MATCH" : "MISMATCH"

export async function applyHostAction(input: unknown) {
	const data = actionSchema.parse(input)
	if (!authorizedHost(data.chatId)) throw new Error("Unauthorized host chat")
	return queryClient.begin(async (tx) => {
		const inquiryId = data.inquiryId ?? null
		const duplicate = await tx`SELECT payload FROM telegram_interactions WHERE update_id=${data.updateId}`
		if (duplicate[0]) return { duplicate: true, ...(duplicate[0].payload as object) }
		const inquiry: Record<string, any> = inquiryId ? ((await tx`SELECT * FROM inquiries WHERE id=${inquiryId} FOR UPDATE`)[0] as Record<string, any> | undefined) ?? {} : {}
		if (inquiryId && !inquiry.id) throw new Error("Inquiry not found")
		if (!inquiryId && !["AIRBNB_STAY_CONFIRMED", "BLOCKED_DATES_ONLY", "IGNORE"].includes(data.action)) throw new Error("Inquiry is required")
		const claim = await tx`INSERT INTO telegram_interactions (update_id,chat_id,inquiry_id,action,state,payload) VALUES (${data.updateId},${data.chatId},${inquiryId},${data.action},'PROCESSING','{}'::jsonb) ON CONFLICT (update_id) DO NOTHING RETURNING update_id`
		if (!claim.length) return { duplicate: true, ...((((await tx`SELECT payload FROM telegram_interactions WHERE update_id=${data.updateId}`)[0]?.payload) as object | undefined) ?? {}) }
		let result: Record<string, unknown> = { action: data.action }
		if (data.action === "REPLY") { await tx`UPDATE inquiries SET telegram_state='AWAITING_REPLY',telegram_draft=NULL,updated_at=now() WHERE id=${inquiryId}`; result = { state: "AWAITING_REPLY", prompt: "Type your reply to the guest." } }
		if (data.action === "REPLY_TEXT") {
			if (inquiry.telegram_state !== "AWAITING_REPLY") throw new Error("Reply mode is not active")
			if (!data.text) throw new Error("Reply text is required")
			await tx`UPDATE inquiries SET telegram_state='DRAFT_READY',telegram_draft=${data.text},updated_at=now() WHERE id=${inquiryId}`
			result = replyPreview(inquiry.email as string, inquiry.public_reference as string, data.text)
		}
		if (data.action === "AI_DRAFT") {
			if (process.env.HOST_AI_DRAFT_ENABLED !== "true") result = { state: "UNAVAILABLE", message: "AI Draft is currently disabled." }
			else { const availability = inquiry.owner_availability_decision ? `The owner verified: ${inquiry.owner_availability_decision}.` : "Do not claim availability; owner verification is still required."; const price = inquiry.quoted_amount_minor ? `The owner-entered price is $${(Number(inquiry.quoted_amount_minor)/100).toFixed(2)} USD.` : "Do not state or invent a price."; const draft = `Hi ${inquiry.guest_first_name},\n\nThank you for your ShellByTheShore inquiry. ${availability} ${price}\n\nBest,\nShellByTheShore`; await tx`UPDATE inquiries SET telegram_state='DRAFT_READY',telegram_draft=${draft},updated_at=now() WHERE id=${inquiryId}`; result = replyPreview(inquiry.email as string, inquiry.public_reference as string, draft) }
		}
		if (data.action === "SET_PRICE") { await tx`UPDATE inquiries SET telegram_state='AWAITING_PRICE',updated_at=now() WHERE id=${inquiryId}`; result = { state: "AWAITING_PRICE", prompt: "Enter the total quoted price in USD." } }
		if (data.action === "PRICE_TEXT") { if (inquiry.telegram_state !== "AWAITING_PRICE") throw new Error("Price mode is not active"); const amount = dollarsToMinor(data.text ?? ""); if (amount === null) throw new Error("Enter a valid USD amount, for example 1250 or 1250.00"); await tx`UPDATE inquiries SET quoted_amount_minor=${amount},quoted_currency='USD',status=CASE WHEN status IN ('NEW','HOST_REVIEW') THEN 'QUOTE_READY' ELSE status END,telegram_state=NULL,updated_at=now() WHERE id=${inquiryId}`; result = { state: "QUOTE_SAVED", amountMinor: amount } }
		if (data.action === "CLEAR_PRICE") { await tx`UPDATE inquiries SET quoted_amount_minor=NULL,quoted_currency=NULL,updated_at=now() WHERE id=${inquiryId}`; result = { state: "PRICE_CLEARED" } }
		if (data.action === "AVAILABLE" || data.action === "NOT_AVAILABLE") { const decision = data.action === "AVAILABLE" ? "OWNER_VERIFIED_AVAILABLE" : "OWNER_VERIFIED_NOT_AVAILABLE"; const latest = await getAirbnbAdvisory(inquiry.check_in as string, inquiry.check_out as string); await tx`UPDATE inquiries SET owner_availability_decision=${decision},owner_verified_at=now(),advisory_at_verification=${latest.advisory},airbnb_sync_at_verification=${latest.lastSuccessfulSync?.toISOString() ?? null}::timestamptz,status=${data.action},updated_at=now() WHERE id=${inquiryId}`; await tx`INSERT INTO availability_reliability_records (id,inquiry_id,advisory,owner_decision,airbnb_last_sync_at,stale_at_decision,comparison_result) VALUES (${nanoid()},${inquiryId},${latest.advisory},${decision},${latest.lastSuccessfulSync?.toISOString() ?? null}::timestamptz,${latest.advisory === "UNKNOWN_STALE"},${comparison(latest.advisory, decision)})`; result = { state: decision, advisory: latest.advisory, manualVerification: true } }
		if (data.action === "MARK_REPLIED") { await tx`UPDATE inquiries SET status='REPLIED',replied_at=COALESCE(replied_at,now()),updated_at=now() WHERE id=${inquiryId}`; result = { state: "REPLIED", emailSent: false } }
		if (data.action === "GUEST_CONFIRMED") { await tx`UPDATE inquiries SET telegram_state='CONFIRM_GUEST_PENDING',updated_at=now() WHERE id=${inquiryId}`; result = { state: "CONFIRM_MANUAL_STAY", confirmationRequired: true } }
		if (data.action === "CONFIRM_GUEST") { if (inquiry.telegram_state !== "CONFIRM_GUEST_PENDING") throw new Error("Second confirmation required"); await tx`UPDATE inquiries SET status='CONFIRMED_MANUAL',confirmed_at=now(),telegram_state=NULL,updated_at=now() WHERE id=${inquiryId}`; result = { state: "CONFIRMED_MANUAL", paymentStatus: "UNPAID" } }
		if (data.action === "CREATE_BOOKING") { if (inquiry.status !== "CONFIRMED_MANUAL") throw new Error("Confirm the manual stay first"); await tx`UPDATE inquiries SET telegram_state='CREATE_BOOKING_PENDING',updated_at=now() WHERE id=${inquiryId}`; result = { state: "CREATE_BOOKING_PREVIEW", confirmationRequired: true, paymentStatus: "UNPAID" } }
		if (data.action === "CONFIRM_CREATE_BOOKING") { if (inquiry.telegram_state !== "CREATE_BOOKING_PENDING") throw new Error("Explicit booking confirmation required"); const existing = await tx`SELECT id FROM reservations WHERE client_request_id=${`INQUIRY:${inquiryId}`}`; let reservationId = existing[0]?.id as string | undefined; if (!reservationId) { reservationId = nanoid(); const amount = Number(inquiry.quoted_amount_minor ?? 0); await tx`INSERT INTO reservations (id,confirmation_code,property_id,booking_source,client_request_id,guest_first_name,guest_last_name,guest_email,guest_phone,check_in,check_out,adults,children,total_guests,booking_status,payment_status,currency,subtotal,cleaning_fee,taxes,discount_amount,total_amount,amount_due,price_snapshot,confirmed_at) VALUES (${reservationId},${`SBS-${nanoid(10).toUpperCase()}`},${inquiry.property_id},'DIRECT_MANUAL',${`INQUIRY:${inquiryId}`},${inquiry.guest_first_name},${inquiry.guest_last_name},${inquiry.email},${inquiry.phone},${inquiry.check_in}::date,${inquiry.check_out}::date,${inquiry.guests},0,${inquiry.guests},'CONFIRMED','UNPAID','USD',${amount},0,0,0,${amount},${amount},${JSON.stringify({ source: "OWNER_CONFIRMED_INQUIRY", inquiryReference: inquiry.public_reference })}::jsonb,now())`; await tx`UPDATE inquiries SET status='BOOKING_CREATED',telegram_state=NULL,updated_at=now() WHERE id=${inquiryId}`; } result = { state: "BOOKING_CREATED", reservationId, charged: false } }
		if (data.action === "EDIT") { if (inquiry.telegram_state !== "DRAFT_READY") throw new Error("A previewed draft is required"); await tx`UPDATE inquiries SET telegram_state='AWAITING_REPLY',updated_at=now() WHERE id=${inquiryId}`; result = { state: "AWAITING_REPLY", draft: inquiry.telegram_draft, prompt: "Edit the reply. The replacement will be previewed before sending." } }
		if (data.action === "SEND_EMAIL" || data.action === "SEND_DRAFT") { if (inquiry.telegram_state !== "DRAFT_READY" || !inquiry.telegram_draft) throw new Error("A previewed draft is required"); if (!isSmtpConfigured()) throw new Error("SMTP is not configured"); const subject = `Re: ShellByTheShore Availability — ${inquiry.public_reference}`; const info = await getTransporter().sendMail({ from: { name: process.env.SMTP_FROM_NAME || "ShellByTheShore", address: getFromEmail() || PUBLIC_GUEST_EMAIL }, to: inquiry.email as string, subject, text: inquiry.telegram_draft as string, inReplyTo: inquiry.email_thread_message_id || undefined, references: inquiry.email_thread_message_id || undefined }); await tx`INSERT INTO inquiry_messages (id,inquiry_id,direction,subject,content_plain,message_id,in_reply_to,references_header,owner_identity,sent_at) VALUES (${nanoid()},${inquiryId},'OUTBOUND',${subject},${inquiry.telegram_draft},${info.messageId || null},${inquiry.email_thread_message_id || null},${inquiry.email_thread_message_id || null},${data.actorId || data.chatId},now())`; await tx`UPDATE inquiries SET status='REPLIED',replied_at=COALESCE(replied_at,now()),email_thread_message_id=COALESCE(${info.messageId || null},email_thread_message_id),telegram_state=NULL,telegram_draft=NULL,updated_at=now() WHERE id=${inquiryId}`; result = { state: "EMAIL_SENT", messageId: info.messageId || null } }
		if (data.action === "CANCEL") { await tx`UPDATE inquiries SET telegram_state=NULL,telegram_draft=NULL,updated_at=now() WHERE id=${inquiryId}`; result = { state: "CANCELLED" } }
		if (["AIRBNB_STAY_CONFIRMED", "BLOCKED_DATES_ONLY", "IGNORE"].includes(data.action)) {
			if (!data.shadowEventId) throw new Error("Shadow event is required")
			const [shadow] = await tx`SELECT * FROM airbnb_shadow_events WHERE id=${data.shadowEventId} FOR UPDATE`
			if (!shadow) throw new Error("Shadow event not found")
			if (data.action === "AIRBNB_STAY_CONFIRMED") {
				const clientRequestId = `AIRBNB:${shadow.external_uid}`
				const [linked] = await tx`SELECT id FROM reservations WHERE id=${shadow.reservation_id ?? null} OR client_request_id=${clientRequestId} ORDER BY (id=${shadow.reservation_id ?? null}) DESC LIMIT 1`
				let reservationId = linked?.id as string | undefined
				if (!reservationId) {
					const properties = await tx`SELECT property_id FROM booking_settings ORDER BY property_id LIMIT 2`
					if (properties.length !== 1) throw new Error("Exactly one operational property must be configured for Airbnb import")
					reservationId = nanoid()
					await tx`INSERT INTO reservations (id,confirmation_code,property_id,booking_source,external_reference,client_request_id,guest_first_name,guest_last_name,guest_email,check_in,check_out,adults,children,total_guests,booking_status,payment_status,currency,subtotal,cleaning_fee,taxes,discount_amount,total_amount,amount_paid,amount_due,price_snapshot,confirmed_at) VALUES (${reservationId},${`SBS-AIRBNB-${nanoid(8).toUpperCase()}`},${properties[0].property_id},'AIRBNB',${shadow.external_uid},${clientRequestId},NULL,NULL,NULL,${shadow.start_at}::date,${shadow.end_at}::date,1,0,NULL,'CONFIRMED','UNKNOWN',NULL,NULL,NULL,NULL,0,NULL,0,NULL,${JSON.stringify({ source: "AIRBNB", identityAvailable: false, guestMessagingEnabled: false, priceAvailable: false, shadowEventId: data.shadowEventId })}::jsonb,now())`
					await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${reservationId},'AIRBNB_STAY_VERIFIED',${JSON.stringify({ shadowEventId: data.shadowEventId, actorId: data.actorId || data.chatId })}::jsonb)`
				}
				await tx`UPDATE airbnb_shadow_events SET owner_classification='AIRBNB_STAY_CONFIRMED',owner_verified_at=now(),owner_verification_result='AIRBNB_STAY_CONFIRMED',reservation_id=${reservationId} WHERE id=${data.shadowEventId}`
				result = { state: "AIRBNB_STAY_CONFIRMED", reservationId, source: "AIRBNB", paymentStatus: "UNKNOWN", guestMessagingEnabled: false }
			} else {
				await tx`UPDATE airbnb_shadow_events SET owner_classification=${data.action},owner_verified_at=now(),owner_verification_result=${data.action} WHERE id=${data.shadowEventId}`
				result = { state: data.action, reservationCreated: false }
			}
		}
		await tx`UPDATE telegram_interactions SET state=${String(result.state ?? "DONE")},payload=${JSON.stringify(result)}::jsonb,processed_at=now() WHERE update_id=${data.updateId}`
		return result
	}).then(async (result) => { if (typeof result.reservationId === "string" && (result.state === "BOOKING_CREATED" || result.state === "AIRBNB_STAY_CONFIRMED")) await recalculateCleaningForReservationChange(result.reservationId, result.state === "AIRBNB_STAY_CONFIRMED" ? "AIRBNB_STAY_VERIFIED" : "MANUAL_BOOKING_CREATED").catch(() => null); return result })
}

export { authorizedHost, classifyUrgency, dollarsToMinor, hostActions }
