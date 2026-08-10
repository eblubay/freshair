"use server"

import { inquiries, properties } from "@/db/schema"
import { getHostEmailAddress } from "@/lib/clerk"
import { db } from "@/lib/db"
import { getFromEmail, getTransporter, isSmtpConfigured } from "@/lib/postmark"
import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"

const inquirySchema = z.object({
	propertyId: z.string().min(1),
	checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date"),
	checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date"),
	guests: z.coerce.number().int().min(1).max(16),
	name: z.string().trim().min(2, "Please enter your full name"),
	email: z.string().trim().email("Please enter a valid email address"),
	phone: z.string().trim().max(40).optional().or(z.literal("")),
	message: z.string().trim().max(2000).optional().or(z.literal(""))
})

export type AvailabilityRequestInput = z.input<typeof inquirySchema>

export type AvailabilityRequestResult =
	| { ok: true; emailSent: boolean }
	| { ok: false; error: string }

/**
 * Availability request (NOT a reservation).
 *
 * 1. validates input
 * 2. persists the inquiry in the database (source of truth)
 * 3. attempts an SMTP notification — a mail failure never discards the
 *    persisted inquiry
 */
export async function requestAvailability(
	input: AvailabilityRequestInput
): Promise<AvailabilityRequestResult> {
	const parsed = inquirySchema.safeParse(input)

	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Invalid request"
		}
	}

	const data = parsed.data

	const checkIn = new Date(`${data.checkIn}T00:00:00`)
	const checkOut = new Date(`${data.checkOut}T00:00:00`)
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
		return { ok: false, error: "Please select valid dates" }
	}

	if (checkIn < today) {
		return { ok: false, error: "Check-in cannot be in the past" }
	}

	if (checkOut <= checkIn) {
		return { ok: false, error: "Check-out must be after check-in" }
	}

	const property = await db
		.select({ id: properties.id })
		.from(properties)
		.where(eq(properties.id, data.propertyId))
		.limit(1)
		.then((rows) => rows[0])

	if (!property) {
		return { ok: false, error: "This property is no longer available" }
	}

	const inquiryId = nanoid()

	try {
		await db.insert(inquiries).values({
			id: inquiryId,
			propertyId: data.propertyId,
			checkIn: data.checkIn,
			checkOut: data.checkOut,
			guests: data.guests,
			name: data.name,
			email: data.email,
			phone: data.phone || null,
			message: data.message || null,
			status: "new",
			emailSent: "pending"
		})
	} catch (error) {
		console.error("[requestAvailability] database insert failed:", error)
		return {
			ok: false,
			error: "We could not save your request. Please try again."
		}
	}

	await db
		.update(properties)
		.set({ inquiries: sql`${properties.inquiries} + 1` })
		.where(eq(properties.id, data.propertyId))
		.catch((error) =>
			console.error("[requestAvailability] counter update failed:", error)
		)

	let emailSent = false

	if (isSmtpConfigured()) {
		try {
			// Clerk is the primary source; env vars are the fallback so a Clerk
			// outage never silences the notification.
			const hostEmail =
				(await getHostEmailAddress(data.propertyId).catch(() => null)) ||
				process.env.HOST_NOTIFICATION_EMAIL ||
				getFromEmail()

			if (hostEmail) {
				const nights = Math.round(
					(checkOut.getTime() - checkIn.getTime()) / 86_400_000
				)

				await getTransporter().sendMail({
					from: getFromEmail(),
					to: hostEmail,
					replyTo: data.email,
					subject: `Availability request — ${data.checkIn} to ${data.checkOut}`,
					text: [
						"New availability request (not a confirmed reservation).",
						"",
						`Name:      ${data.name}`,
						`Email:     ${data.email}`,
						`Phone:     ${data.phone || "-"}`,
						`Check-in:  ${data.checkIn}`,
						`Check-out: ${data.checkOut}`,
						`Nights:    ${nights}`,
						`Guests:    ${data.guests}`,
						"",
						"Message:",
						data.message || "-",
						"",
						`Inquiry ID: ${inquiryId}`
					].join("\n")
				})

				emailSent = true
			}
		} catch (error) {
			console.error("[requestAvailability] SMTP notification failed:", error)
		}
	}

	await db
		.update(inquiries)
		.set({ emailSent: emailSent ? "sent" : "failed" })
		.where(eq(inquiries.id, inquiryId))
		.catch(() => undefined)

	return { ok: true, emailSent }
}
