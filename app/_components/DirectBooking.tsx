"use client"

import { BraintreeCheckout } from "@/app/_components/BraintreeCheckout"
import { StripeCheckout } from "@/app/_components/StripeCheckout"
import { useMemo, useRef, useState } from "react"

type DirectBookingProps = { propertyId: string; maxGuests: number }
type Quote = { quoteId: string; expiresAt: string; nights: number; currency: string; subtotal: number; cleaningFee: number; taxes: number; discount: number; total: number; directBookingEnabled: boolean; paymentsEnabled: boolean; paymentProvider: "BRAINTREE" | "STRIPE" }
type Hold = { reservationId: string; confirmationCode: string; holdExpiresAt: string }

const money = (value: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100)
const isoToday = () => new Date().toISOString().slice(0, 10)
const isoTomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10) }

export function DirectBooking({ propertyId, maxGuests }: DirectBookingProps) {
	const [checkIn, setCheckIn] = useState("")
	const [checkOut, setCheckOut] = useState("")
	const [adults, setAdults] = useState("2")
	const [children, setChildren] = useState("0")
	const [couponCode, setCouponCode] = useState("")
	const [referralCode, setReferralCode] = useState("")
	const [quote, setQuote] = useState<Quote | null>(null)
	const [hold, setHold] = useState<Hold | null>(null)
	const [state, setState] = useState<"idle" | "loading" | "error" | "confirmed">("idle")
	const [error, setError] = useState<string | null>(null)
	const [guest, setGuest] = useState({ firstName: "", lastName: "", email: "", phone: "" })
	const requestId = useRef<string | null>(null)
	const canQuote = useMemo(() => Boolean(checkIn && checkOut && checkOut > checkIn && Number(adults) + Number(children) <= maxGuests), [adults, checkIn, checkOut, children, maxGuests])
	const input = () => ({ propertyId, checkIn, checkOut, adults: Number(adults), children: Number(children), couponCode: couponCode.trim() || undefined, referralCode: referralCode.trim() || undefined })

	function resetQuote() { setQuote(null); setHold(null); setError(null); requestId.current = null }
	async function getQuote() {
		if (!canQuote) return setError(`Choose valid dates and no more than ${maxGuests} guests.`)
		setState("loading"); setError(null); setHold(null)
		try {
			const response = await fetch("/api/bookings/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input()) })
			const data = await response.json()
			if (!response.ok) throw new Error(data.error ?? "Unable to prepare a quote.")
			setQuote(data); setState("idle")
		} catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to prepare a quote."); setState("error") }
	}
	async function holdDates() {
		if (!quote) return
		if (!guest.firstName || !guest.lastName || !guest.email) return setError("Enter your name and email before continuing.")
		setState("loading"); setError(null)
		try {
			requestId.current ??= crypto.randomUUID()
			const response = await fetch("/api/bookings/hold", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteInput: input(), guest, clientRequestId: requestId.current }) })
			const data = await response.json()
			if (!response.ok) throw new Error(data.error ?? "Unable to hold dates.")
			setHold(data); setState("idle")
		} catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to hold dates."); setState("error") }
	}

	const field = "w-full border border-[#d8cdba] bg-white px-3 py-3 text-sm text-[#28323b] outline-none focus:border-[#c2683f]"
	if (state === "confirmed") return <div className="border border-[#e6ddcf] bg-[#fdfbf7] p-6 text-center"><p className="text-[11px] uppercase tracking-[.18em] text-[#8d7c66]">Booking confirmed</p><h3 className="mt-2 font-serif text-2xl">Thank you for booking.</h3><p className="mt-3 text-sm text-[#5d6b78]">Your confirmation code is <strong>{hold?.confirmationCode}</strong>. A confirmation email will follow using the configured delivery service.</p></div>

	return <section className="border border-[#e6ddcf] bg-[#fdfbf7] p-6 sm:p-8">
		<p className="text-[11px] uppercase tracking-[.18em] text-[#8d7c66]">Direct booking</p><h3 className="mt-2 font-serif text-2xl">Check dates and pricing</h3>
		<div className="mt-6 grid grid-cols-2 gap-3"><input aria-label="Direct booking check-in" className={field} type="date" min={isoToday()} value={checkIn} onChange={(event) => { setCheckIn(event.target.value); resetQuote() }} /><input aria-label="Direct booking check-out" className={field} type="date" min={checkIn || isoTomorrow()} value={checkOut} onChange={(event) => { setCheckOut(event.target.value); resetQuote() }} /><select aria-label="Adults" className={field} value={adults} onChange={(event) => { setAdults(event.target.value); resetQuote() }}>{Array.from({ length: maxGuests }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} adult{i ? "s" : ""}</option>)}</select><select aria-label="Children" className={field} value={children} onChange={(event) => { setChildren(event.target.value); resetQuote() }}>{Array.from({ length: maxGuests }, (_, i) => <option key={i} value={i}>{i} children</option>)}</select></div>
		<input aria-label="Coupon code" className={`${field} mt-3`} placeholder="Coupon code (optional)" value={couponCode} onChange={(event) => { setCouponCode(event.target.value); resetQuote() }} />
		<input aria-label="Referral code" className={`${field} mt-3`} placeholder="Referral code (optional)" value={referralCode} onChange={(event) => { setReferralCode(event.target.value); resetQuote() }} />
		<button type="button" disabled={state === "loading"} onClick={getQuote} className="mt-4 w-full bg-[#28323b] px-5 py-3 text-xs uppercase tracking-[.16em] text-white disabled:opacity-60">{state === "loading" ? "Checking…" : "Check availability"}</button>
		{error && <p role="alert" className="mt-4 text-sm text-[#b33939]">{error}</p>}
		{quote && <><div className="mt-6 border-y border-[#e6ddcf] py-4 text-sm text-[#5d6b78]">{quote.discount > 0 && <p className="mb-2">Discount <span className="float-right">−{money(quote.discount, quote.currency)}</span></p>}<p>{quote.nights} nights <span className="float-right">{money(quote.subtotal, quote.currency)}</span></p><p className="mt-2">Cleaning <span className="float-right">{money(quote.cleaningFee, quote.currency)}</span></p><p className="mt-2">Taxes <span className="float-right">{money(quote.taxes, quote.currency)}</span></p><p className="mt-3 font-semibold text-[#28323b]">Total <span className="float-right">{money(quote.total, quote.currency)}</span></p></div>
			{quote.directBookingEnabled && !hold && <div className="mt-5 grid gap-3"><div className="grid grid-cols-2 gap-3"><input className={field} placeholder="First name" value={guest.firstName} onChange={(event) => setGuest({ ...guest, firstName: event.target.value })}/><input className={field} placeholder="Last name" value={guest.lastName} onChange={(event) => setGuest({ ...guest, lastName: event.target.value })}/></div><input className={field} type="email" placeholder="Email address" value={guest.email} onChange={(event) => setGuest({ ...guest, email: event.target.value })}/><input className={field} type="tel" placeholder="Phone (optional)" value={guest.phone} onChange={(event) => setGuest({ ...guest, phone: event.target.value })}/><button type="button" disabled={state === "loading"} onClick={holdDates} className="w-full border border-[#28323b] px-5 py-3 text-xs uppercase tracking-[.16em] text-[#28323b] disabled:opacity-60">{state === "loading" ? "Holding dates…" : "Continue to secure payment"}</button></div>}
			{quote.directBookingEnabled && hold && <><p className="mt-5 text-sm text-[#5d6b78]">Dates are temporarily held until {new Date(hold.holdExpiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Complete secure payment before the hold expires.</p>{quote.paymentProvider === "STRIPE" ? <StripeCheckout reservationId={hold.reservationId} onSuccess={() => setState("confirmed")}/> : <BraintreeCheckout reservationId={hold.reservationId} onSuccess={() => setState("confirmed")}/>}</>}
			{!quote.directBookingEnabled && <p className="mt-5 text-sm leading-relaxed text-[#5d6b78]">Direct booking is not live yet. Please use the availability request below.</p>}</>}
	</section>
}
