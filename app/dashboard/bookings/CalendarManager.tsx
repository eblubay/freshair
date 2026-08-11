"use client"

import { FormEvent, useState } from "react"

type Calendar = { id: string; propertyId: string; provider: string; displayName: string | null; enabled: boolean; lastSuccessAt: string | null; lastError: string | null; lastSyncStatus: string }

export function CalendarManager({ calendars, propertyIds }: { calendars: Calendar[]; propertyIds: string[] }) {
	const [message, setMessage] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	async function create(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setSaving(true); setMessage(null)
		const values = new FormData(event.currentTarget)
		const response = await fetch("/api/internal/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: values.get("propertyId"), provider: values.get("provider"), displayName: values.get("displayName"), url: values.get("url"), enabled: true }) })
		const data = await response.json(); setSaving(false)
		setMessage(response.ok ? "Calendar saved. Refresh this page, then choose Sync now." : (data.error ?? "Unable to save calendar."))
	}
	async function sync(calendarId: string) {
		setSaving(true); setMessage(null)
		const response = await fetch("/api/internal/calendar/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarId }) })
		const data = await response.json(); setSaving(false)
		setMessage(response.ok ? `Sync complete: ${data.events ?? 0} active event(s). Refresh to see status.` : (data.error ?? "Calendar sync failed."))
	}
	const field = "border border-[#d8cdba] bg-white px-3 py-3 text-sm outline-none focus:border-[#c2683f]"
	return <section className="mt-12 border border-[#e6ddcf] bg-white p-6 sm:p-8"><p className="text-[11px] uppercase tracking-[.18em] text-[#8d7c66]">OTA iCal imports</p><h2 className="mt-2 font-serif text-3xl">External availability</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5d6b78]">Paste only public iCal export URLs. No OTA login automation is used. Sync imports availability blocks, reconciles changed/removed events, and recalculates affected cleaning turnovers.</p>{calendars.length > 0 && <div className="mt-6 divide-y divide-[#e6ddcf] border-y border-[#e6ddcf]">{calendars.map((calendar) => <div key={calendar.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm"><div><strong>{calendar.displayName ?? calendar.provider}</strong><span className="ml-2 text-[#5d6b78]">{calendar.provider} · {calendar.enabled ? calendar.lastSyncStatus : "DISABLED"}</span><span className="mt-1 block text-xs text-[#8d7c66]">Last success: {calendar.lastSuccessAt ?? "Never"}{calendar.lastError ? ` · ${calendar.lastError}` : ""}</span></div><button type="button" disabled={saving || !calendar.enabled} onClick={() => void sync(calendar.id)} className="border border-[#28323b] px-4 py-2 text-xs uppercase tracking-[.14em] disabled:opacity-50">Sync now</button></div>)}</div>}<form onSubmit={create} className="mt-7 grid gap-3 sm:grid-cols-2"><select className={field} name="propertyId" required><option value="">Choose property</option>{propertyIds.map((propertyId) => <option key={propertyId} value={propertyId}>{propertyId}</option>)}</select><select className={field} name="provider" defaultValue="AIRBNB"><option value="AIRBNB">Airbnb</option><option value="BOOKING_COM">Booking.com</option><option value="OTHER_OTA">Other OTA</option></select><input className={field} name="displayName" placeholder="Calendar name" required/><input className={field} name="url" type="url" placeholder="https://…/calendar.ics" required/><button disabled={saving || propertyIds.length === 0} className="sm:col-span-2 bg-[#28323b] px-5 py-3 text-xs uppercase tracking-[.16em] text-white disabled:opacity-50">{saving ? "Working…" : "Add external calendar"}</button></form>{message && <p className="mt-4 text-sm text-[#5d6b78]">{message}</p>}</section>
}
