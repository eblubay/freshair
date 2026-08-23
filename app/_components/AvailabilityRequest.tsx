"use client"

import { requestAvailability } from "@/lib/bookings"
import { useState } from "react"

type AvailabilityRequestProps = {
	propertyId: string
	maxGuests: number
}

function isoToday(): string {
	const now = new Date()
	now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
	return now.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
	const date = new Date(`${iso}T00:00:00`)
	date.setDate(date.getDate() + days)
	date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
	return date.toISOString().slice(0, 10)
}

/**
 * Availability request — deliberately NOT a reservation.
 *
 * Native date inputs replace the previous react-day-picker popover, which was
 * unreliable (check-in/check-out could not be set on mobile). Native inputs
 * give real keyboard, touch and locale support with min/max constraints.
 */
export function AvailabilityRequest({
	propertyId,
	maxGuests
}: AvailabilityRequestProps) {
	const today = isoToday()

	const [checkIn, setCheckIn] = useState("")
	const [checkOut, setCheckOut] = useState("")
	const [guests, setGuests] = useState("2")
	const [firstName, setFirstName] = useState("")
	const [lastName, setLastName] = useState("")
	const [email, setEmail] = useState("")
	const [phone, setPhone] = useState("")
	const [message, setMessage] = useState("")
	const [website, setWebsite] = useState("")
	const [idempotencyKey] = useState(() => crypto.randomUUID())

	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [done, setDone] = useState(false)

	const nights =
		checkIn && checkOut
			? Math.max(
					0,
					Math.round(
						(new Date(`${checkOut}T00:00:00`).getTime() -
							new Date(`${checkIn}T00:00:00`).getTime()) /
							86_400_000
					)
				)
			: 0

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (submitting || done) return // double-submit guard

		setError(null)

		if (!checkIn) return setError("Please choose your check-in date.")
		if (!checkOut) return setError("Please choose your check-out date.")
		if (checkOut <= checkIn) return setError("Check-out must be after check-in.")
		if (!firstName.trim()) return setError("Please enter your first name.")
		if (!lastName.trim()) return setError("Please enter your last name.")
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
			return setError("Please enter a valid email address.")

		setSubmitting(true)

		try {
			const result = await requestAvailability({
				propertyId,
				checkIn,
				checkOut,
				guests: Number(guests),
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.trim(),
				phone: phone.trim(),
				message: message.trim(),
				website,
				idempotencyKey
			})

			if (result.ok) {
				setDone(true)
			} else {
				setError(result.error)
			}
		} catch (submitError) {
			console.error("[AvailabilityRequest]", submitError)
			setError("Something went wrong. Please try again in a moment.")
		} finally {
			setSubmitting(false)
		}
	}

	if (done) {
		return (
			<div className="border border-[#e6ddcf] bg-[#fdfbf7] p-8 text-center">
				<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1e4d8] text-xl text-[#c2683f]">
					✓
				</div>
				<h3 className="font-serif text-2xl text-[#28323b]">Request received</h3>
				<p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-[#5d6b78]">
					Your availability request has been received. This request does not create
					or confirm a reservation. We&apos;ll reply with availability and pricing.
				</p>
				<p className="mt-4 text-sm text-[#8d7c66]">
					A reply will be sent to {email}
				</p>
			</div>
		)
	}

	const fieldClass =
		"w-full border border-[#d8cdba] bg-white px-4 py-3 text-[15px] text-[#28323b] outline-none transition-colors focus:border-[#c2683f]"
	const labelClass =
		"mb-2 block text-[11px] uppercase tracking-[0.16em] text-[#8d7c66]"

	return (
		<form
			onSubmit={onSubmit}
			noValidate
			className="border border-[#e6ddcf] bg-[#fdfbf7] p-6 sm:p-8"
		>
			<h3 className="font-serif text-2xl text-[#28323b]">Request availability</h3>
			<p className="mt-2 text-sm leading-relaxed text-[#5d6b78]">
				Request Availability is only an inquiry and does not create a reservation.
				Availability, terms and acceptance are confirmed manually by the host.
			</p>

			<div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div>
					<label className={labelClass} htmlFor="checkIn">
						Check-in
					</label>
					<input
						id="checkIn"
						name="checkIn"
						type="date"
						required
						min={today}
						value={checkIn}
						onChange={(event) => {
							const value = event.target.value
							setCheckIn(value)
							// Keep check-out valid relative to the new check-in.
							if (value && (!checkOut || checkOut <= value)) {
								setCheckOut(addDays(value, 2))
							}
						}}
						className={fieldClass}
					/>
				</div>

				<div>
					<label className={labelClass} htmlFor="checkOut">
						Check-out
					</label>
					<input
						id="checkOut"
						name="checkOut"
						type="date"
						required
						min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
						value={checkOut}
						onChange={(event) => setCheckOut(event.target.value)}
						className={fieldClass}
					/>
				</div>

				<div>
					<label className={labelClass} htmlFor="guests">
						Guests
					</label>
					<select
						id="guests"
						name="guests"
						value={guests}
						onChange={(event) => setGuests(event.target.value)}
						className={fieldClass}
					>
						{Array.from({ length: Math.max(1, maxGuests) }, (_, index) => index + 1).map(
							(value) => (
								<option key={value} value={value}>
									{value} {value === 1 ? "guest" : "guests"}
								</option>
							)
						)}
					</select>
				</div>

				<div>
					<label className={labelClass} htmlFor="firstName">
						First name
					</label>
					<input
						id="firstName"
						name="firstName"
						type="text"
						required
						autoComplete="given-name"
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						className={fieldClass}
					/>
				</div>

				<div>
					<label className={labelClass} htmlFor="lastName">Last name</label>
					<input id="lastName" name="lastName" type="text" required autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} />
				</div>

				<div className="sm:col-span-2">
					<label className={labelClass} htmlFor="email">
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={fieldClass}
					/>
				</div>
				<div className="absolute -left-[10000px]" aria-hidden="true">
					<label htmlFor="website">Website</label>
					<input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
				</div>

				<div className="sm:col-span-2">
					<label className={labelClass} htmlFor="phone">
						Phone <span className="normal-case tracking-normal">(optional)</span>
					</label>
					<input
						id="phone"
						name="phone"
						type="tel"
						autoComplete="tel"
						value={phone}
						onChange={(event) => setPhone(event.target.value)}
						className={fieldClass}
					/>
				</div>

				<div className="sm:col-span-2">
					<label className={labelClass} htmlFor="message">
						Message <span className="normal-case tracking-normal">(optional)</span>
					</label>
					<textarea
						id="message"
						name="message"
						rows={4}
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						className={`${fieldClass} resize-y`}
					/>
				</div>
			</div>

			{nights > 0 && (
				<p className="mt-5 text-sm text-[#5d6b78]">
					{nights} {nights === 1 ? "night" : "nights"} requested
				</p>
			)}

			{error && (
				<p
					role="alert"
					className="mt-5 border-l-2 border-[#b4472f] bg-[#faf0ec] px-4 py-3 text-sm text-[#8d3722]"
				>
					{error}
				</p>
			)}

			<button
				type="submit"
				disabled={submitting}
				className="mt-7 w-full bg-[#28323b] px-8 py-4 text-xs uppercase tracking-[0.2em] text-[#fdfbf7] transition-colors hover:bg-[#3d4b57] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? "Sending request…" : "Request availability"}
			</button>

			<p className="mt-4 text-center text-[12px] leading-relaxed text-[#8d7c66]">
				No payment required. This is a request, not a confirmed reservation.
			</p>
		</form>
	)
}
