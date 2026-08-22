import "server-only"

import { createGuestAccessToken } from "@/lib/guest-access"
import { queryClient } from "@/lib/db"
import { getFromEmail, getTransporter, isSmtpConfigured } from "@/lib/postmark"
import { nanoid } from "nanoid"

type AutomationEvent = "PRE_ARRIVAL_3_DAY" | "PRE_ARRIVAL_1_DAY" | "CHECKIN_DAY" | "CHECKOUT_DAY"

type ReservationRow = {
	id: string
	confirmation_code: string
	guest_first_name: string
	guest_email: string
	check_in: string
	check_out: string
	checkin_time: string | null
	checkout_time: string | null
	automation_event: AutomationEvent
}

function baseUrl() {
	return (process.env.SHELLBYTHESHORE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")
}

function messageFor(event: AutomationEvent, reservation: ReservationRow, portalUrl: string | null) {
	const greeting = `Hi ${reservation.guest_first_name},`
	if (event === "PRE_ARRIVAL_3_DAY") {
		return {
			subject: "Your ShellByTheShore stay is coming up",
			text: `${greeting}\n\nYour stay begins on ${reservation.check_in}. Your secure guest portal${portalUrl ? ` is ready: ${portalUrl}` : " will be shared before arrival"}. Please use it to review your stay and complete check-in when convenient.\n\nShellByTheShore`
		}
	}
	if (event === "PRE_ARRIVAL_1_DAY") {
		return {
			subject: "One day until your ShellByTheShore arrival",
			text: `${greeting}\n\nWe look forward to welcoming you tomorrow${reservation.checkin_time ? ` at ${reservation.checkin_time}` : ""}. Complete your secure check-in and review arrival information here: ${portalUrl ?? "Your guest portal link will be sent separately."}\n\nShellByTheShore`
		}
	}
	if (event === "CHECKIN_DAY") {
		return {
			subject: "Welcome to ShellByTheShore",
			text: `${greeting}\n\nToday is your arrival day${reservation.checkin_time ? `. Check-in begins at ${reservation.checkin_time}` : ""}. Your private arrival details are available according to the configured release window in your secure guest portal: ${portalUrl ?? "Your guest portal link will be sent separately."}\n\nShellByTheShore`
		}
	}
	return {
		subject: "Thank you for staying with ShellByTheShore",
		text: `${greeting}\n\nWe hope you enjoyed your stay. Checkout is${reservation.checkout_time ? ` by ${reservation.checkout_time}` : " today"}. Thank you for choosing ShellByTheShore.\n\nShellByTheShore`
	}
}

async function portalLink(reservationId: string, checkout: string) {
	const expiresAt = new Date(`${checkout}T00:00:00.000Z`)
	expiresAt.setUTCDate(expiresAt.getUTCDate() + 7)
	const token = await createGuestAccessToken(reservationId, expiresAt)
	const root = baseUrl()
	return root ? `${root}/guest?token=${encodeURIComponent(token)}` : null
}

export async function runPreArrivalAutomation() {
	if (!isSmtpConfigured() || !getFromEmail()) {
		return { status: "NOT_CONFIGURED" as const, delivered: 0, skipped: 0 }
	}
	const root = baseUrl()
	if (!root) return { status: "NOT_CONFIGURED" as const, delivered: 0, skipped: 0 }

	const candidates = await queryClient<ReservationRow[]>`
		SELECT r.id,r.confirmation_code,r.guest_first_name,r.guest_email,r.check_in::text,r.check_out::text,
			b.checkin_time,b.checkout_time,
			CASE
				WHEN r.check_out=current_date THEN 'CHECKOUT_DAY'
				WHEN r.check_in=current_date + 3 THEN 'PRE_ARRIVAL_3_DAY'
				WHEN r.check_in=current_date + 1 THEN 'PRE_ARRIVAL_1_DAY'
				ELSE 'CHECKIN_DAY'
			END AS automation_event
		FROM reservations r
		JOIN booking_settings b ON b.property_id=r.property_id
		WHERE r.booking_status='CONFIRMED'
			AND NULLIF(trim(r.guest_first_name),'') IS NOT NULL
			AND NULLIF(trim(r.guest_email),'') IS NOT NULL
			AND (
				r.check_in=current_date + 3
				OR r.check_in=current_date + 1
				OR r.check_in=current_date
				OR r.check_out=current_date
			)
	`

	let delivered = 0
	let skipped = 0
	for (const reservation of candidates) {
		const event = reservation.automation_event
		const [alreadySent] = await queryClient`
			SELECT 1 FROM booking_events
			WHERE reservation_id=${reservation.id} AND event_type=${event}
			LIMIT 1
		`
		if (alreadySent) {
			skipped += 1
			continue
		}

		const portalUrl = event === "CHECKOUT_DAY" ? null : await portalLink(reservation.id, reservation.check_out)
		const message = messageFor(event, reservation, portalUrl)
		await getTransporter().sendMail({ from: getFromEmail(), to: reservation.guest_email, subject: message.subject, text: message.text })
		await queryClient`
			INSERT INTO booking_events (id,reservation_id,event_type,payload)
			VALUES (${nanoid()},${reservation.id},${event},${JSON.stringify({ channel: "SMTP" })}::jsonb)
		`
		delivered += 1
	}

	return { status: "READY" as const, delivered, skipped }
}
