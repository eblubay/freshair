import "server-only"

import { syncAirbnbShadowCalendar } from "@/lib/airbnb-shadow"
import { recalculateCleaningForReservationChange } from "@/lib/cleaning-domain"
import { parseIcalEvents } from "@/lib/ical"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"

const maxCalendarBytes = 2_000_000
const otaSource = (provider: string) => provider === "AIRBNB" ? "AIRBNB" : provider === "BOOKING_COM" ? "BOOKING_COM" : "OTHER_OTA"

async function ensureAirbnbShadowSource() {
	const url = process.env.AIRBNB_ICAL_URL
	if (!url) return null
	return queryClient.begin(async (tx) => {
		await tx`SELECT pg_advisory_xact_lock(hashtext('AIRBNB_ENV_SHADOW_SOURCE'))`
		const [existing] = await tx`SELECT id FROM external_calendars WHERE provider='AIRBNB' ORDER BY id LIMIT 1 FOR UPDATE`
		if (existing) {
			await tx`UPDATE external_calendars SET url=${url},enabled=true,display_name='Airbnb — Import Only / Read Only' WHERE id=${existing.id}`
			return existing.id as string
		}
		const [property] = await tx`SELECT id FROM properties ORDER BY created_at LIMIT 1`
		if (!property) throw new Error("No property is configured for the Airbnb calendar source.")
		const id = "airbnb-env-shadow"
		await tx`INSERT INTO external_calendars (id,property_id,provider,url,enabled,display_name) VALUES (${id},${property.id},'AIRBNB',${url},true,'Airbnb — Import Only / Read Only') ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url,enabled=true,display_name=EXCLUDED.display_name`
		return id
	})
}

export async function syncExternalCalendar(calendarId: string) {
	try {
	const [calendar] = await queryClient`SELECT id,property_id,provider,url,enabled,etag,last_modified FROM external_calendars WHERE id=${calendarId}`
	if (!calendar?.enabled) throw new Error("External calendar is not available for sync.")
	const headers: Record<string, string> = { Accept: "text/calendar, text/plain;q=0.9" }
	if (calendar.etag) headers["If-None-Match"] = calendar.etag as string
	if (calendar.last_modified) headers["If-Modified-Since"] = calendar.last_modified as string
	const response = await fetch(calendar.url as string, { headers, signal: AbortSignal.timeout(15_000), redirect: "follow", cache: "no-store" })
	if (response.status === 304) {
		await queryClient`UPDATE external_calendars SET last_sync_at=now(),last_success_at=now(),last_sync_status='READY',last_error=NULL WHERE id=${calendarId}`
		return { calendarId, unchanged: true, events: 0 }
	}
	if (!response.ok) throw new Error(`Calendar returned HTTP ${response.status}.`)
	const body = await response.text()
	if (body.length > maxCalendarBytes) throw new Error("Calendar feed exceeds the safe size limit.")
	const events = parseIcalEvents(body)
	const changedReservationIds = await queryClient.begin(async (tx) => {
		const ids: string[] = []
		await tx`UPDATE calendar_events SET active=false,updated_at=now() WHERE external_calendar_id=${calendarId} AND active=true`
		for (const event of events) {
			const [existing] = await tx`SELECT reservation_id FROM calendar_events WHERE external_calendar_id=${calendarId} AND external_uid=${event.uid} FOR UPDATE`
			let reservationId = existing?.reservation_id as string | undefined
			if (!reservationId) {
				reservationId = nanoid()
				await tx`INSERT INTO reservations (id,confirmation_code,property_id,booking_source,external_reference,guest_first_name,guest_last_name,guest_email,check_in,check_out,adults,children,total_guests,booking_status,payment_status,currency,subtotal,cleaning_fee,taxes,discount_amount,total_amount,amount_due,price_snapshot) VALUES (${reservationId},${`OTA-${nanoid(10).toUpperCase()}`},${calendar.property_id},${otaSource(calendar.provider as string)},${event.uid},'External','Calendar','calendar@unavailable.invalid',${event.checkIn}::date,${event.checkOut}::date,1,0,1,'CONFIRMED','EXTERNAL','USD',0,0,0,0,0,0,${JSON.stringify({ source: "ICAL", calendarId, uid: event.uid })}::jsonb)`
			}
			await tx`DELETE FROM inventory_days WHERE reservation_id=${reservationId}`
			for (let day = new Date(`${event.checkIn}T00:00:00Z`); day < new Date(`${event.checkOut}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
				const date = day.toISOString().slice(0, 10)
				const [occupied] = await tx`SELECT reservation_id,source,status FROM inventory_days WHERE property_id=${calendar.property_id} AND date=${date}::date FOR UPDATE`
				if (occupied && occupied.reservation_id !== reservationId) throw new Error(`Calendar event ${event.uid} conflicts with existing ${occupied.source} inventory on ${date}.`)
				await tx`INSERT INTO inventory_days (property_id,date,reservation_id,source,status,external_reference) VALUES (${calendar.property_id},${date}::date,${reservationId},${otaSource(calendar.provider as string)},'CONFIRMED',${event.uid}) ON CONFLICT (property_id,date) DO UPDATE SET reservation_id=EXCLUDED.reservation_id,source=EXCLUDED.source,status='CONFIRMED',external_reference=EXCLUDED.external_reference,hold_expires_at=NULL`
			}
			await tx`INSERT INTO calendar_events (id,external_calendar_id,external_uid,reservation_id,check_in,check_out,summary,sequence,raw_hash,active,last_seen_at,updated_at) VALUES (${nanoid()},${calendarId},${event.uid},${reservationId},${event.checkIn}::date,${event.checkOut}::date,${event.summary},${event.sequence},${event.rawHash},true,now(),now()) ON CONFLICT (external_calendar_id,external_uid) DO UPDATE SET reservation_id=EXCLUDED.reservation_id,check_in=EXCLUDED.check_in,check_out=EXCLUDED.check_out,summary=EXCLUDED.summary,sequence=EXCLUDED.sequence,raw_hash=EXCLUDED.raw_hash,active=true,last_seen_at=now(),updated_at=now()`
			await tx`UPDATE reservations SET check_in=${event.checkIn}::date,check_out=${event.checkOut}::date,booking_status='CONFIRMED',updated_at=now() WHERE id=${reservationId}`
			ids.push(reservationId)
		}
		const removed = await tx`SELECT reservation_id FROM calendar_events WHERE external_calendar_id=${calendarId} AND active=false AND reservation_id IS NOT NULL`
		for (const row of removed) { await tx`UPDATE reservations SET booking_status='CANCELLED',cancelled_at=now(),updated_at=now() WHERE id=${row.reservation_id}`; await tx`DELETE FROM inventory_days WHERE reservation_id=${row.reservation_id}`; ids.push(row.reservation_id as string) }
		await tx`UPDATE external_calendars SET last_sync_at=now(),last_success_at=now(),last_sync_status='READY',last_event_count=${events.length},last_error=NULL,etag=${response.headers.get("etag")},last_modified=${response.headers.get("last-modified")} WHERE id=${calendarId}`
		return ids
	})
	await Promise.all(changedReservationIds.map((id) => recalculateCleaningForReservationChange(id, "ICAL_SYNC").catch(() => null)))
	return { calendarId, unchanged: false, events: events.length }
	} catch (error) {
		const message = error instanceof Error ? error.message.slice(0, 1000) : "Calendar sync failed."
		await queryClient`UPDATE external_calendars SET last_sync_at=now(),last_sync_status='ERROR',last_error=${message} WHERE id=${calendarId}`.catch(() => null)
		throw error
	}
}

export async function syncEnabledExternalCalendars() {
	// AIRBNB_ICAL_URL is the authoritative initial-launch Airbnb source. It is
	// intentionally never copied into a response or log and uses the conservative
	// shadow importer rather than the legacy reservation-producing OTA importer.
	const airbnbSourceId = await ensureAirbnbShadowSource()
	const calendars = await queryClient`SELECT id FROM external_calendars WHERE enabled=true AND provider <> 'AIRBNB' ORDER BY last_sync_at NULLS FIRST LIMIT 99`
	const syncs: Array<Promise<unknown>> = calendars.map((calendar) => syncExternalCalendar(calendar.id as string))
	if (airbnbSourceId) syncs.unshift(syncAirbnbShadowCalendar())
	const results = await Promise.allSettled(syncs)
	return {
		total: syncs.length,
		succeeded: results.filter((result) => result.status === "fulfilled").length,
		failed: results.filter((result) => result.status === "rejected").length
	}
}
