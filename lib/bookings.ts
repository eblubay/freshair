"use server"

import { randomBytes } from "crypto"
import { inquiries, properties } from "@/db/schema"
import { getAirbnbAdvisory } from "@/lib/airbnb-shadow"
import { getHostEmailAddress } from "@/lib/clerk"
import { db, queryClient } from "@/lib/db"
import { inquirySchema, type AvailabilityRequestInput, type AvailabilityRequestResult } from "@/lib/inquiry-validation"
import { getConfiguredMaxOccupancy, PUBLIC_GUEST_EMAIL } from "@/lib/launch-config"
import { getFromEmail, getTransporter, isSmtpConfigured } from "@/lib/postmark"
import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { telegramCallbackData } from "@/lib/telegram-host-api"

const publicReference = () => `SBS-${randomBytes(4).toString("hex").toUpperCase()}`
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))

async function sendTelegramOwnerAlert(message: string, inquiryId: string) {
	const token = process.env.TELEGRAM_HOST_BOT_TOKEN
	const chatId = process.env.TELEGRAM_HOST_CHAT_ID
	if (!token || !chatId) return false
	const button = (text: string, action: string) => ({ text, callback_data: telegramCallbackData(action, inquiryId) })
	const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: message, reply_markup: { inline_keyboard: [[button("Reply", "REPLY"), button("AI Draft", "AI_DRAFT")], [button("Set Price", "SET_PRICE"), button("Available", "AVAILABLE")], [button("Not Available", "NOT_AVAILABLE"), button("Mark Replied", "MARK_REPLIED")], [button("Guest Confirmed", "GUEST_CONFIRMED"), button("Create Booking", "CREATE_BOOKING")]] } }) })
	return response.ok
}

/** Persists an inquiry only; it never creates inventory, reservation, price, or payment records. */
export async function requestAvailability(input: AvailabilityRequestInput): Promise<AvailabilityRequestResult> {
	const parsed = inquirySchema.safeParse(input)
	if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }
	const data = parsed.data
	if (data.website) return { ok: true, emailSent: false, reference: "SBS-RECEIVED" }
	const checkIn = new Date(`${data.checkIn}T00:00:00Z`); const checkOut = new Date(`${data.checkOut}T00:00:00Z`)
	const today = new Date(); today.setUTCHours(0, 0, 0, 0)
	if (checkIn < today) return { ok: false, error: "Check-in cannot be in the past" }
	if (checkOut <= checkIn) return { ok: false, error: "Check-out must be after check-in" }
	if (data.guests > getConfiguredMaxOccupancy(16)) return { ok: false, error: `Guest count exceeds the maximum occupancy of ${getConfiguredMaxOccupancy(16)}` }
	const property = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, data.propertyId)).limit(1).then((rows) => rows[0])
	if (!property) return { ok: false, error: "This property is no longer available" }
	const existing = await queryClient`SELECT public_reference,email_sent FROM inquiries WHERE idempotency_key=${data.idempotencyKey} LIMIT 1`
	if (existing[0]) return { ok: true, emailSent: existing[0].email_sent === "sent", reference: existing[0].public_reference as string }
	const inquiryId = nanoid(); const reference = publicReference()
	const advisory = await getAirbnbAdvisory(data.checkIn, data.checkOut).catch(() => ({ advisory: "UNKNOWN_STALE" as const, lastSuccessfulSync: null }))
	try {
		await db.insert(inquiries).values({ id: inquiryId, propertyId: data.propertyId, publicReference: reference, checkIn: data.checkIn, checkOut: data.checkOut, guests: data.guests, name: `${data.firstName} ${data.lastName}`, guestFirstName: data.firstName, guestLastName: data.lastName, email: data.email, phone: data.phone || null, message: data.message || null, status: "NEW", emailSent: "pending", idempotencyKey: data.idempotencyKey, airbnbAdvisoryAtCreation: advisory.advisory, airbnbLastSyncAt: advisory.lastSuccessfulSync })
	} catch (error) {
		const duplicate = await queryClient`SELECT public_reference,email_sent FROM inquiries WHERE idempotency_key=${data.idempotencyKey} LIMIT 1`.catch(() => [])
		if (duplicate[0]) return { ok: true, emailSent: duplicate[0].email_sent === "sent", reference: duplicate[0].public_reference as string }
		console.error("[inquiry] database insert failed")
		return { ok: false, error: "We could not save your request. Please try again." }
	}
	await db.update(properties).set({ inquiries: sql`${properties.inquiries} + 1` }).where(eq(properties.id, data.propertyId)).catch(() => undefined)
	const advisoryLabel = advisory.advisory === "APPEARS_AVAILABLE" ? "🟢 APPEARS AVAILABLE" : advisory.advisory === "APPEARS_UNAVAILABLE" ? "🔴 APPEARS UNAVAILABLE" : "⚠️ UNKNOWN / STALE"
	await sendTelegramOwnerAlert(["🏖 NEW AVAILABILITY REQUEST", "", `Ref: ${reference}`, `Guest: ${data.firstName} ${data.lastName}`, `Dates: ${formatDate(data.checkIn)} – ${formatDate(data.checkOut)}`, `Guests: ${data.guests}`, `Email: ${data.email}`, `Phone: ${data.phone || "—"}`, `Message: ${data.message || "—"}`, "", "AIRBNB CALENDAR:", advisoryLabel, `Last successful sync: ${advisory.lastSuccessfulSync?.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) ?? "Not available"}`, "", "⚠️ MANUAL VERIFICATION REQUIRED", "", "Status: NEW"].join("\n"), inquiryId).catch(() => false)
	let emailSent = false
	if (isSmtpConfigured()) {
		try {
			const from = getFromEmail() || PUBLIC_GUEST_EMAIL
			const hostEmail = (await getHostEmailAddress(data.propertyId).catch(() => null)) || process.env.HOST_NOTIFICATION_EMAIL || from
			const transporter = getTransporter()
			await transporter.sendMail({ from, to: hostEmail, replyTo: data.email, subject: `[${reference}] New availability request`, text: `New availability request (not confirmed).\n\nGuest: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone || "-"}\nCheck-in: ${data.checkIn}\nCheck-out: ${data.checkOut}\nGuests: ${data.guests}\nMessage: ${data.message || "-"}\n\nAirbnb advisory: ${advisory.advisory}\nMANUAL VERIFICATION REQUIRED\nReference: ${reference}` })
			const info = await transporter.sendMail({ from: { name: process.env.SMTP_FROM_NAME || "ShellByTheShore", address: from }, to: data.email, replyTo: PUBLIC_GUEST_EMAIL, subject: `We received your ShellByTheShore availability request — ${reference}`, text: `Hi ${data.firstName},\n\nThank you for your interest in ShellByTheShore.\n\nWe received your request for:\n\nCheck-in: ${formatDate(data.checkIn)}\nCheck-out: ${formatDate(data.checkOut)}\nGuests: ${data.guests}\n\nWe’ll review the requested dates and reply with availability and pricing.\n\nPlease note that this request does not create or confirm a reservation.\n\nShellByTheShore\nManhattan Beach, California\n${PUBLIC_GUEST_EMAIL}` })
			await queryClient`UPDATE inquiries SET email_thread_message_id=${info.messageId || null} WHERE id=${inquiryId}`
			emailSent = true
		} catch { console.error("[inquiry] SMTP delivery failed") }
	}
	await db.update(inquiries).set({ emailSent: emailSent ? "sent" : "failed" }).where(eq(inquiries.id, inquiryId)).catch(() => undefined)
	return { ok: true, emailSent, reference }
}
