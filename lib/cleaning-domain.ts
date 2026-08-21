import "server-only"

import { calculateCleaningSchedule } from "@/lib/cleaning-rules"
import { queryClient } from "@/lib/db"
import { getFromEmail, getTransporter, isSmtpConfigured } from "@/lib/postmark"
import { nanoid } from "nanoid"
import { z } from "zod"

const sourceValues = ["DIRECT", "AIRBNB", "BOOKING_COM", "OTHER_OTA", "MANUAL"] as const
const taskStatuses = ["PENDING", "NOTIFIED", "ACKNOWLEDGED", "IN_PROGRESS", "COMPLETED", "ISSUE", "CANCELLED"] as const
const taskActions = ["CONFIRM", "STARTED", "COMPLETED", "PROBLEM", "CANCEL"] as const

type ReservationRow = { id: string; property_id: string; booking_source: string; check_in: string; check_out: string }

const actionSchema = z.object({ taskId: z.string().min(8), action: z.enum(taskActions), actorId: z.string().min(1).max(128), channel: z.enum(["TELEGRAM", "EMAIL", "ADMIN"]).default("ADMIN"), issueType: z.enum(["DAMAGE", "ACCESS", "SUPPLIES", "MAINTENANCE", "EXCESSIVE_CLEANING", "LOST_ITEM", "OTHER"]).optional(), note: z.string().trim().max(2000).optional() })

function eventPayload(value: unknown) { return JSON.stringify(value) }

export async function recalculateCleaningTaskForCheckout(checkoutReservationId: string, reason = "CALENDAR_CHANGED") {
	const [checkout] = await queryClient<ReservationRow[]>`
		SELECT id, property_id, booking_source, check_in::text, check_out::text
		FROM reservations
		WHERE id=${checkoutReservationId} AND booking_status IN ('CONFIRMED','COMPLETED')
			AND booking_source IN ('DIRECT_MANUAL','AIRBNB','DIRECT','MANUAL','BOOKING_COM','OTHER_OTA')
	`
	if (!checkout) return null

	const [settings] = await queryClient`
		SELECT b.timezone, b.checkin_time, b.checkout_time, c.enabled, c.default_cleaner_id, c.normal_completion_buffer_hours,
			c.no_next_guest_max_days
		FROM booking_settings b
		LEFT JOIN cleaning_settings c ON c.property_id=b.property_id
		WHERE b.property_id=${checkout.property_id}
	`
	if (!settings?.enabled) return null

	const [nextArrival] = await queryClient<ReservationRow[]>`
		SELECT id, property_id, booking_source, check_in::text, check_out::text
		FROM reservations
		WHERE property_id=${checkout.property_id}
			AND booking_status IN ('CONFIRMED','COMPLETED')
			AND booking_source IN ('DIRECT_MANUAL','AIRBNB','DIRECT','MANUAL','BOOKING_COM','OTHER_OTA')
			AND check_in >= ${checkout.check_out}::date
			AND id <> ${checkout.id}
		ORDER BY check_in ASC, created_at ASC
		LIMIT 1
	`
	const schedule = calculateCleaningSchedule({
		checkoutDate: checkout.check_out,
		checkoutTime: settings.checkout_time as string | null,
		nextCheckinDate: nextArrival?.check_in ?? null,
		nextCheckinTime: settings.checkin_time as string | null
	}, {
		timezone: settings.timezone as string,
		normalCompletionBufferHours: Number(settings.normal_completion_buffer_hours ?? 0),
		noNextGuestMaxDays: settings.no_next_guest_max_days === null ? null : Number(settings.no_next_guest_max_days)
	})

	return queryClient.begin(async (tx) => {
		const [current] = await tx`SELECT id, status, cleaning_deadline::text FROM cleaning_tasks WHERE property_id=${checkout.property_id} AND checkout_reservation_id=${checkout.id} FOR UPDATE`
		if (current?.status === "COMPLETED") return { taskId: current.id as string, unchanged: true, reason: "ALREADY_COMPLETED" }
		const taskId = (current?.id as string | undefined) ?? nanoid()
		const previousDeadline = current?.cleaning_deadline as string | null
		await tx`
			INSERT INTO cleaning_tasks (id,property_id,checkout_reservation_id,checkout_source,checkout_date,next_reservation_id,next_arrival_source,next_checkin_date,same_day_turnover,no_upcoming_arrival,cleaning_window_start,cleaning_deadline,priority,status,assigned_cleaner_id,updated_at)
			VALUES (${taskId},${checkout.property_id},${checkout.id},${checkout.booking_source},${checkout.check_out}::date,${nextArrival?.id ?? null},${nextArrival?.booking_source ?? null},${nextArrival?.check_in ?? null}::date,${schedule.sameDayTurnover},${schedule.noUpcomingArrival},${schedule.windowStart.toISOString()}::timestamptz,${schedule.deadline?.toISOString() ?? null}::timestamptz,${schedule.priority},'PENDING',${settings.default_cleaner_id ?? null},now())
			ON CONFLICT (property_id,checkout_reservation_id) DO UPDATE SET
			 next_reservation_id=EXCLUDED.next_reservation_id,next_arrival_source=EXCLUDED.next_arrival_source,next_checkin_date=EXCLUDED.next_checkin_date,same_day_turnover=EXCLUDED.same_day_turnover,no_upcoming_arrival=EXCLUDED.no_upcoming_arrival,cleaning_window_start=EXCLUDED.cleaning_window_start,cleaning_deadline=EXCLUDED.cleaning_deadline,priority=EXCLUDED.priority,assigned_cleaner_id=COALESCE(cleaning_tasks.assigned_cleaner_id,EXCLUDED.assigned_cleaner_id),updated_at=now()
		`
		const eventType = current ? "CLEANING_TASK_UPDATED" : "CLEANING_TASK_CREATED"
		await tx`INSERT INTO cleaning_task_events (id,task_id,actor_type,event_type,payload) VALUES (${nanoid()},${taskId},'SYSTEM',${eventType},${eventPayload({ reason, previousDeadline, nextArrival: nextArrival?.check_in ?? null, deadline: schedule.deadline?.toISOString() ?? null })}::jsonb)`
		await tx`INSERT INTO audit_events (id,actor_type,event_type,metadata) VALUES (${nanoid()},'SYSTEM',${eventType},${eventPayload({ taskId, propertyId: checkout.property_id, reason })}::jsonb)`
		return { taskId, unchanged: false, sameDayTurnover: schedule.sameDayTurnover, nextArrival: nextArrival?.check_in ?? null, deadline: schedule.deadline?.toISOString() ?? null }
	})
}

/** Re-evaluates the departure affected by a confirmed/cancelled arrival change. */
export async function recalculateCleaningForReservationChange(reservationId: string, reason = "CALENDAR_CHANGED") {
	const [reservation] = await queryClient<ReservationRow[]>`
		SELECT id, property_id, booking_source, check_in::text, check_out::text
		FROM reservations WHERE id=${reservationId}
	`
	if (!reservation) return null
	const [priorCheckout] = await queryClient<ReservationRow[]>`
		SELECT id, property_id, booking_source, check_in::text, check_out::text
		FROM reservations
		WHERE property_id=${reservation.property_id} AND id <> ${reservation.id}
			AND booking_status IN ('CONFIRMED','COMPLETED') AND check_out <= ${reservation.check_in}::date
		ORDER BY check_out DESC, created_at DESC LIMIT 1
	`
	const affected = new Set([reservation.id, priorCheckout?.id].filter(Boolean) as string[])
	return Promise.all([...affected].map((checkoutId) => recalculateCleaningTaskForCheckout(checkoutId, reason)))
}

export async function applyCleaningTaskAction(input: unknown) {
	const data = actionSchema.parse(input)
	return queryClient.begin(async (tx) => {
		const [task] = await tx`SELECT id, status FROM cleaning_tasks WHERE id=${data.taskId} FOR UPDATE`
		if (!task) throw new Error("Cleaning task not found.")
		if (task.status === "COMPLETED" && data.action !== "PROBLEM") throw new Error("This cleaning task is already completed.")
		const transition = {
			CONFIRM: ["ACKNOWLEDGED", "acknowledged_at", "CLEANING_ACKNOWLEDGED"],
			STARTED: ["IN_PROGRESS", "started_at", "CLEANING_STARTED"],
			COMPLETED: ["COMPLETED", "completed_at", "CLEANING_COMPLETED"],
			PROBLEM: ["ISSUE", "issue_reported_at", "CLEANING_PROBLEM_REPORTED"],
			CANCEL: ["CANCELLED", "updated_at", "CLEANING_CANCELLED"]
		} as const
		const [status, timestampColumn, eventType] = transition[data.action]
		await tx.unsafe(`UPDATE cleaning_tasks SET status=$1, ${timestampColumn}=now(), updated_at=now() WHERE id=$2`, [status, data.taskId])
		if (data.action === "PROBLEM") await tx`INSERT INTO cleaning_incidents (id,task_id,issue_type,notes,reported_by) VALUES (${nanoid()},${data.taskId},${data.issueType ?? "OTHER"},${data.note ?? null},${data.actorId})`
		await tx`INSERT INTO cleaning_task_events (id,task_id,actor_type,actor_id,event_type,channel,payload) VALUES (${nanoid()},${data.taskId},'CLEANER',${data.actorId},${eventType},${data.channel},${eventPayload({ note: data.note ?? null, issueType: data.issueType ?? null })}::jsonb)`
		return { taskId: data.taskId, status, eventType }
	})
}

export const reservationSourceSchema = z.enum(sourceValues)

export async function notifyCleanerForTask(taskId: string) {
	const [task] = await queryClient`
		SELECT t.id,t.checkout_date::text,t.checkout_time,t.next_checkin_date::text,t.next_checkin_time,t.same_day_turnover,t.priority,t.cleaning_deadline::text,
			c.email,c.telegram_chat_id,c.preferred_channel
		FROM cleaning_tasks t LEFT JOIN cleaners c ON c.id=t.assigned_cleaner_id WHERE t.id=${taskId}
	`
	if (!task) throw new Error("Cleaning task not found.")
	const subject = `ShellByTheShore Cleaning — Checkout ${task.checkout_date}${task.next_checkin_date ? ` / Next Arrival ${task.next_checkin_date}` : ""}`
	const urgency = task.same_day_turnover ? "🚨 SAME-DAY TURNOVER" : "🧹 ShellByTheShore Cleaning"
	const body = `${urgency}\n\nCheckout: ${task.checkout_date}${task.checkout_time ? ` — ${task.checkout_time}` : ""}\nNext arrival: ${task.next_checkin_date ? `${task.next_checkin_date}${task.next_checkin_time ? ` — ${task.next_checkin_time}` : ""}` : "No upcoming arrival currently scheduled"}\nCleaning deadline: ${task.cleaning_deadline ?? "No configured deadline"}\nPriority: ${task.priority}\n\nPlease confirm this cleaning task.`
	let channel = "NONE"
	if (task.preferred_channel === "TELEGRAM" && task.telegram_chat_id) {
		// Telegram delivery is orchestrated in n8n; no bot token is loaded here.
		channel = "TELEGRAM_N8N"
	} else if (task.email && isSmtpConfigured()) {
		await getTransporter().sendMail({ from: getFromEmail(), to: task.email as string, subject, text: body })
		channel = "EMAIL"
	}
	await queryClient.begin(async (tx) => {
		await tx`UPDATE cleaning_tasks SET status=CASE WHEN status='PENDING' THEN 'NOTIFIED' ELSE status END, notified_at=now(), updated_at=now() WHERE id=${taskId}`
		await tx`INSERT INTO cleaning_task_events (id,task_id,actor_type,event_type,channel,payload) VALUES (${nanoid()},${taskId},'SYSTEM','CLEANING_NOTIFICATION_SENT',${channel},${eventPayload({ recipientConfigured: channel !== "NONE" })}::jsonb)`
	})
	return { taskId, channel, delivered: channel !== "NONE" }
}
