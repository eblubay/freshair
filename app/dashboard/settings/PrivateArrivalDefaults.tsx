"use client"

import { FormEvent, useState } from "react"

type Property = { id: string; name: string }

export function PrivateArrivalDefaults({ properties }: { properties: Property[] }) {
	const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "")
	const [message, setMessage] = useState<string | null>(null)
	const field = "w-full border border-[#d8cdba] bg-white px-3 py-3 text-sm outline-none focus:border-[#c2683f]"
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage(null)
		const form = new FormData(event.currentTarget)
		const payload = {
			propertyId,
			doorCode: String(form.get("doorCode") || "") || null,
			wifiName: String(form.get("wifiName") || "") || null,
			wifiPassword: String(form.get("wifiPassword") || "") || null,
			checkinNotes: String(form.get("checkinNotes") || "") || null,
			parkingNotes: String(form.get("parkingNotes") || "") || null
		}
		const response = await fetch("/api/internal/property-private-defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
		const data = await response.json()
		setMessage(response.ok ? "Encrypted private arrival defaults saved." : (data.error ?? "Unable to save private arrival defaults."))
		if (response.ok) event.currentTarget.reset()
	}
	if (!propertyId) return null
	return <section className="mt-7 border border-[#e6ddcf] bg-white p-6"><h2 className="font-serif text-3xl">Private arrival defaults</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5d6b78]">These values are encrypted by the server. They are deliberately not displayed after saving and are released to the matching guest only within the configured arrival window.</p><form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-[#5d6b78]">Property<select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={`${field} mt-1`}>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label className="text-sm text-[#5d6b78]">Door code<input name="doorCode" autoComplete="off" className={`${field} mt-1`}/></label><label className="text-sm text-[#5d6b78]">Wi-Fi SSID<input name="wifiName" autoComplete="off" className={`${field} mt-1`}/></label><label className="text-sm text-[#5d6b78]">Wi-Fi password<input name="wifiPassword" type="password" autoComplete="new-password" className={`${field} mt-1`}/></label><label className="text-sm text-[#5d6b78] sm:col-span-2">Private arrival instructions<textarea name="checkinNotes" className={`${field} mt-1 min-h-24`}/></label><label className="text-sm text-[#5d6b78] sm:col-span-2">Private parking instructions<textarea name="parkingNotes" className={`${field} mt-1 min-h-24`}/></label><button className="bg-[#28323b] px-5 py-3 text-xs uppercase tracking-[.16em] text-white sm:col-span-2">Save encrypted arrival defaults</button></form>{message && <p className="mt-4 text-sm text-[#5d6b78]">{message}</p>}</section>
}
