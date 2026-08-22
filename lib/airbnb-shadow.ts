import "server-only"

import { createHash } from "crypto"
import { queryClient } from "@/lib/db"
import { parseIcalEvents } from "@/lib/ical"
import { advisoryFromEvents, calendarHealth } from "@/lib/shadow-advisory"
import { nanoid } from "nanoid"

const MAX_FEED_BYTES = 2_000_000
const safeError = (error: unknown) => (error instanceof Error ? error.message : "Calendar sync failed").replace(/https?:\/\/\S+/gi, "[redacted-url]").slice(0, 500)
const safeSummary = (value: string | null) => value?.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || null

export async function getAirbnbAdvisory(checkIn: string, checkOut: string) {
	const [state] = await queryClient`SELECT last_successful_sync,last_sync_success FROM airbnb_calendar_state WHERE source='AIRBNB_ICAL'`
	const health = calendarHealth({ configured: Boolean(process.env.AIRBNB_ICAL_URL), lastSuccess: state?.last_successful_sync ? new Date(state.last_successful_sync as string) : null, lastSyncSuccess: state?.last_sync_success as boolean | null ?? null })
	const events = health === "FRESH" ? await queryClient`SELECT start_at::text AS start,end_at::text AS end FROM airbnb_shadow_events WHERE active=true AND start_at < ${checkOut}::date AND end_at > ${checkIn}::date` : []
	return { advisory: advisoryFromEvents(checkIn, checkOut, events as Array<{ start: string; end: string }>, health), lastSuccessfulSync: state?.last_successful_sync ? new Date(state.last_successful_sync as string) : null }
}

/** Pull-only sync. No Airbnb write/export operation exists in this module. */
export async function syncAirbnbShadowCalendar() {
	const started = Date.now()
	const url = process.env.AIRBNB_ICAL_URL
	if (!url) return { health: "NOT_CONFIGURED" as const, added: 0, changed: 0, removed: 0 }
	try {
		const response = await fetch(url, { headers: { Accept: "text/calendar" }, cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15_000) })
		if (!response.ok) throw new Error(`Airbnb calendar returned HTTP ${response.status}`)
		const body = await response.text()
		if (body.length > MAX_FEED_BYTES) throw new Error("Airbnb calendar exceeded the safe size limit")
		const parsed = parseIcalEvents(body)
		if (!/BEGIN:VCALENDAR/i.test(body)) throw new Error("Malformed iCalendar feed")
		const feedModified = response.headers.get("last-modified")
		const result = await queryClient.begin(async (tx) => {
			let added = 0; let changed = 0
			const seen: string[] = []
			for (const event of parsed) {
				const stableUid = createHash("sha256").update(event.uid).digest("hex")
				seen.push(stableUid)
				const [existing] = await tx`SELECT id,reservation_id,source_hash,start_at::text,end_at::text FROM airbnb_shadow_events WHERE external_uid=${stableUid}`
				if (!existing) added += 1
				else if (existing.source_hash !== event.rawHash || existing.start_at !== event.checkIn || existing.end_at !== event.checkOut) {
					changed += 1
					if (existing.reservation_id) await tx`INSERT INTO operational_health_alerts (alert_key,kind,severity,message) VALUES (${`AIRBNB_EVENT_CHANGED:${existing.id}`},'AIRBNB_MANUAL_VERIFICATION','WARNING','A verified Airbnb calendar event changed. Confirm dates manually; the linked operational stay was not modified automatically.') ON CONFLICT (alert_key) DO UPDATE SET occurrence_count=operational_health_alerts.occurrence_count+1,last_seen_at=now(),resolved_at=NULL`
				}
				await tx`INSERT INTO airbnb_shadow_events (id,external_uid,start_at,end_at,summary_sanitized,source_hash) VALUES (${nanoid()},${stableUid},${event.checkIn}::date,${event.checkOut}::date,${safeSummary(event.summary)},${event.rawHash}) ON CONFLICT (external_uid) DO UPDATE SET start_at=EXCLUDED.start_at,end_at=EXCLUDED.end_at,summary_sanitized=EXCLUDED.summary_sanitized,source_hash=EXCLUDED.source_hash,active=true,last_seen_at=now(),last_sync_at=now(),removed_from_feed_at=NULL`
			}
			const removedRows = seen.length ? await tx`UPDATE airbnb_shadow_events SET active=false,removed_from_feed_at=COALESCE(removed_from_feed_at,now()),last_sync_at=now() WHERE active=true AND NOT (external_uid = ANY(${seen}::text[])) RETURNING id,reservation_id` : await tx`UPDATE airbnb_shadow_events SET active=false,removed_from_feed_at=COALESCE(removed_from_feed_at,now()),last_sync_at=now() WHERE active=true RETURNING id,reservation_id`
			for (const removed of removedRows) if (removed.reservation_id) await tx`INSERT INTO operational_health_alerts (alert_key,kind,severity,message) VALUES (${`AIRBNB_EVENT_MISSING:${removed.id}`},'AIRBNB_MANUAL_VERIFICATION','WARNING','A verified Airbnb event disappeared from iCal. The linked operational stay remains confirmed until the owner verifies cancellation.') ON CONFLICT (alert_key) DO UPDATE SET occurrence_count=operational_health_alerts.occurrence_count+1,last_seen_at=now(),resolved_at=NULL`
			const active = parsed.length
			const material = added + changed + removedRows.length > 0
			await tx`INSERT INTO airbnb_calendar_state (source,last_sync_attempt,last_successful_sync,last_sync_success,last_duration_ms,active_events,consecutive_failures,feed_last_modified_at,last_material_change_at,last_error_sanitized,updated_at) VALUES ('AIRBNB_ICAL',now(),now(),true,${Date.now()-started},${active},0,${feedModified}::timestamptz,${material ? new Date().toISOString() : null}::timestamptz,NULL,now()) ON CONFLICT (source) DO UPDATE SET last_sync_attempt=now(),last_successful_sync=now(),last_sync_success=true,last_duration_ms=EXCLUDED.last_duration_ms,active_events=EXCLUDED.active_events,consecutive_failures=0,feed_last_modified_at=EXCLUDED.feed_last_modified_at,last_material_change_at=COALESCE(EXCLUDED.last_material_change_at,airbnb_calendar_state.last_material_change_at),last_error_sanitized=NULL,updated_at=now()`
			await tx`INSERT INTO airbnb_sync_history (id,successful,duration_ms,active_events,events_added,events_changed,events_removed,feed_last_modified_at) VALUES (${nanoid()},true,${Date.now()-started},${active},${added},${changed},${removedRows.length},${feedModified}::timestamptz)`
			await tx`DELETE FROM airbnb_sync_history WHERE id IN (SELECT id FROM airbnb_sync_history ORDER BY attempted_at DESC OFFSET 200)`
			return { added, changed, removed: removedRows.length, active }
		})
		return { health: "FRESH" as const, ...result }
	} catch (error) {
		const message = safeError(error)
		await queryClient.begin(async (tx) => {
			await tx`INSERT INTO airbnb_calendar_state (source,last_sync_attempt,last_sync_success,last_duration_ms,consecutive_failures,last_error_sanitized) VALUES ('AIRBNB_ICAL',now(),false,${Date.now()-started},1,${message}) ON CONFLICT (source) DO UPDATE SET last_sync_attempt=now(),last_sync_success=false,last_duration_ms=EXCLUDED.last_duration_ms,consecutive_failures=airbnb_calendar_state.consecutive_failures+1,last_error_sanitized=EXCLUDED.last_error_sanitized,updated_at=now()`
			await tx`INSERT INTO airbnb_sync_history (id,successful,duration_ms,error_sanitized) VALUES (${nanoid()},false,${Date.now()-started},${message})`
			await tx`DELETE FROM airbnb_sync_history WHERE id IN (SELECT id FROM airbnb_sync_history ORDER BY attempted_at DESC OFFSET 200)`
		})
		throw new Error(message)
	}
}
