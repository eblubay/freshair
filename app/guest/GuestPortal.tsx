"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

type Reservation = { confirmationCode: string; guestFirstName: string; checkIn: string; checkOut: string; privateDetailsAvailable: boolean; privateDetails: { doorCode: string; wifiName: string | null; wifiPassword: string | null; checkinNotes: string | null; parkingNotes: string | null } | null }

export function GuestPortal() {
	const query = useSearchParams()
	const [token, setToken] = useState("")
	const [reservation, setReservation] = useState<Reservation | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [checkinMessage, setCheckinMessage] = useState<string | null>(null)

	async function open(accessToken: string) {
		if (!accessToken) return
		setLoading(true); setError(null)
		try {
			const response = await fetch("/api/guest/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: accessToken }), cache: "no-store" })
			const data = await response.json()
			if (!response.ok) throw new Error(data.error ?? "Unable to open the guest portal.")
			setReservation(data)
		} catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open the guest portal.") } finally { setLoading(false) }
	}

	useEffect(() => {
		const value = query.get("token")
		if (!value) return
		setToken(value)
		// Remove the credential from the visible URL as soon as the portal reads it.
		window.history.replaceState({}, "", "/guest")
		void open(value)
	}, [query])
	function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void open(token) }
	async function submitCheckin(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		setCheckinMessage(null)
		const response = await fetch("/api/guest/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, arrivalTime: form.get("arrivalTime"), occupants: form.get("occupants"), emergencyContact: form.get("emergencyContact"), typedConfirmation: form.get("typedConfirmation"), houseRulesVersion: "2026-08-10", agreementVersion: "2026-08-10" }) })
		const data = await response.json()
		setCheckinMessage(response.ok ? "Check-in acknowledgment saved." : (data.error ?? "Unable to save check-in."))
	}
	const field = "w-full border border-[#d8cdba] bg-white px-3 py-3 text-sm outline-none focus:border-[#c2683f]"
	if (reservation) return <section className="mt-10 border border-[#e6ddcf] bg-white p-6 sm:p-8"><p className="text-[11px] uppercase tracking-[.2em] text-[#8d7c66]">Reservation {reservation.confirmationCode}</p><h2 className="mt-3 font-serif text-3xl">Welcome, {reservation.guestFirstName}.</h2><p className="mt-4 text-sm text-[#5d6b78]">Stay: {reservation.checkIn} to {reservation.checkOut}</p><div className="mt-7 flex flex-wrap gap-3"><Link className="border border-[#28323b] px-4 py-3 text-xs uppercase tracking-[.14em]" href="/house-guide">House guide</Link><Link className="border border-[#28323b] px-4 py-3 text-xs uppercase tracking-[.14em]" href="/guide">Local guide</Link></div>{reservation.privateDetailsAvailable && reservation.privateDetails ? <div className="mt-8 border-t border-[#e6ddcf] pt-6"><p className="text-[11px] uppercase tracking-[.2em] text-[#8d7c66]">Private arrival details</p><dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-[#5d6b78]">Door code</dt><dd className="mt-1 font-medium">{reservation.privateDetails.doorCode}</dd></div>{reservation.privateDetails.wifiName && <div><dt className="text-[#5d6b78]">Wi-Fi</dt><dd className="mt-1 font-medium">{reservation.privateDetails.wifiName}{reservation.privateDetails.wifiPassword ? ` · ${reservation.privateDetails.wifiPassword}` : ""}</dd></div>}{reservation.privateDetails.checkinNotes && <div><dt className="text-[#5d6b78]">Arrival note</dt><dd className="mt-1 leading-relaxed">{reservation.privateDetails.checkinNotes}</dd></div>}{reservation.privateDetails.parkingNotes && <div><dt className="text-[#5d6b78]">Parking note</dt><dd className="mt-1 leading-relaxed">{reservation.privateDetails.parkingNotes}</dd></div>}</dl></div> : <p className="mt-8 border-t border-[#e6ddcf] pt-6 text-sm leading-relaxed text-[#5d6b78]">Private arrival details will appear here when the configured pre-arrival release window opens.</p>}<form onSubmit={submitCheckin} className="mt-8 border-t border-[#e6ddcf] pt-6"><p className="text-[11px] uppercase tracking-[.2em] text-[#8d7c66]">Digital check-in</p><p className="mt-2 text-sm leading-relaxed text-[#5d6b78]">Confirm your arrival details and acknowledge the house rules.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={field} name="arrivalTime" placeholder="Expected arrival time"/><input className={field} name="occupants" type="number" min="1" max="16" defaultValue="1" required/><input className={`${field} sm:col-span-2`} name="emergencyContact" placeholder="Emergency contact (optional)"/><input className={`${field} sm:col-span-2`} name="typedConfirmation" placeholder="Type your full name to acknowledge" required/></div><label className="mt-4 flex gap-3 text-sm leading-relaxed text-[#5d6b78]"><input required type="checkbox"/>I acknowledge the current house rules and guest agreement.</label><button className="mt-4 bg-[#28323b] px-5 py-3 text-xs uppercase tracking-[.16em] text-white">Save check-in</button>{checkinMessage && <p className="mt-3 text-sm text-[#5d6b78]">{checkinMessage}</p>}</form></section>
	return <form onSubmit={submit} className="mt-10 border border-[#e6ddcf] bg-white p-6 sm:p-8"><label className="text-sm font-medium" htmlFor="guest-token">Secure access token</label><input id="guest-token" className={`${field} mt-3`} value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off"/><button disabled={loading} className="mt-4 bg-[#28323b] px-5 py-3 text-xs uppercase tracking-[.16em] text-white disabled:opacity-60">{loading ? "Opening…" : "Open guest portal"}</button>{error && <p role="alert" className="mt-4 text-sm text-[#b33939]">{error}</p>}</form>
}
