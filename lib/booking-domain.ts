import "server-only"

import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"
import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const quoteInputSchema = z.object({ propertyId: z.string().min(1), checkIn: isoDate, checkOut: isoDate, adults: z.coerce.number().int().min(1).max(16), children: z.coerce.number().int().min(0).max(16), couponCode: z.string().trim().max(64).optional() })
export type Quote = { quoteId: string; expiresAt: string; nights: number; currency: string; nightly: { date: string; amount: number }[]; subtotal: number; cleaningFee: number; taxes: number; discount: number; total: number; directBookingEnabled: boolean; paymentsEnabled: boolean; paymentProvider: "BRAINTREE" | "STRIPE" }
export const guestSchema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.string().trim().email().max(254), phone: z.string().trim().max(40).optional() })
export class BookingDomainError extends Error { constructor(message: string, public readonly status = 400) { super(message) } }

const addDays = (date: string, count: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + count); return value.toISOString().slice(0, 10) }
const nightsBetween = (checkIn: string, checkOut: string) => Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000)

export async function createQuote(input: unknown): Promise<Quote> {
	const data = quoteInputSchema.parse(input)
	const nights = nightsBetween(data.checkIn, data.checkOut)
	if (!Number.isInteger(nights) || nights < 1 || nights > 90) throw new BookingDomainError("Please choose a valid stay length.")
	if (data.checkIn < new Date().toISOString().slice(0, 10)) throw new BookingDomainError("Check-in cannot be in the past.")
	const [settings] = await queryClient`SELECT b.*,COALESCE(ps.provider,'BRAINTREE') AS payment_provider FROM booking_settings b LEFT JOIN payment_settings ps ON ps.property_id=b.property_id WHERE b.property_id = ${data.propertyId}`
	if (!settings) throw new BookingDomainError("Direct booking settings are not configured for this property.", 503)
	if (data.adults + data.children > settings.max_guests) throw new BookingDomainError("The selected guest count exceeds this home’s capacity.")
	if (nights < settings.min_stay_nights || nights > settings.max_stay_nights) throw new BookingDomainError("The selected stay does not meet the configured stay rules.")
	if (Date.parse(`${data.checkIn}T00:00:00Z`) < Date.now() + Number(settings.min_booking_lead_hours) * 3_600_000) throw new BookingDomainError("This stay does not meet the minimum booking lead time.")
	const requestedDates = Array.from({ length: nights }, (_, index) => addDays(data.checkIn, index))
	const conflicts = await queryClient`SELECT date FROM inventory_days WHERE property_id = ${data.propertyId} AND date >= ${data.checkIn}::date AND date < ${data.checkOut}::date AND (status <> 'HOLD' OR hold_expires_at > now()) LIMIT 1`
	if (conflicts.length) throw new BookingDomainError("Those dates are no longer available.", 409)
	const overrides = await queryClient`SELECT date::text, nightly_rate, blocked FROM rate_calendar WHERE property_id = ${data.propertyId} AND date >= ${data.checkIn}::date AND date < ${data.checkOut}::date`
	const overrideByDate = new Map(overrides.map((row) => [row.date, row]))
	const nightly = requestedDates.map((date) => { const row = overrideByDate.get(date); if (row?.blocked) throw new BookingDomainError("One or more selected dates are unavailable.", 409); return { date, amount: row?.nightly_rate ?? settings.base_nightly_rate } })
	if (nightly.some((item) => item.amount <= 0)) throw new BookingDomainError("Nightly rates must be configured before direct booking is enabled.", 503)
	const subtotal = nightly.reduce((sum, item) => sum + item.amount, 0)
	let discount = 0
	if (data.couponCode) {
		const [coupon] = await queryClient`SELECT * FROM coupons WHERE upper(code) = upper(${data.couponCode}) AND active = true AND (expiration_date IS NULL OR expiration_date >= current_date) AND (max_uses IS NULL OR current_uses < max_uses)`
		if (!coupon) throw new BookingDomainError("That coupon is not valid for this stay.")
		discount = coupon.discount_type === "PERCENTAGE" ? Math.floor(subtotal * coupon.discount_value / 10_000) : Math.min(subtotal, coupon.discount_value)
	}
	const taxable = Math.max(0, subtotal + settings.cleaning_fee - discount)
	const taxes = Math.floor(taxable * settings.tax_rate_basis_points / 10_000)
	return { quoteId: nanoid(), expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), nights, currency: settings.currency, nightly, subtotal, cleaningFee: settings.cleaning_fee, taxes, discount, total: taxable + taxes, directBookingEnabled: settings.direct_booking_enabled, paymentsEnabled: settings.payments_enabled, paymentProvider: settings.payment_provider === "STRIPE" ? "STRIPE" : "BRAINTREE" }
}

export async function createHold(input: unknown, rawGuest: unknown, clientRequestId: string) {
	const quote = await createQuote(input)
	if (!quote.directBookingEnabled) throw new BookingDomainError("Direct booking is not configured yet. Please request availability.", 503)
	const data = quoteInputSchema.parse(input)
	const guest = guestSchema.parse(rawGuest)
	const reservationId = nanoid(); const code = `SBS-${nanoid(8).toUpperCase()}`
	const [settings] = await queryClient`SELECT booking_hold_minutes FROM booking_settings WHERE property_id = ${data.propertyId}`
	const holdMinutes = Math.min(30, Math.max(5, Number(settings?.booking_hold_minutes ?? 15)))
	let result: { reservationId: string; confirmationCode: string; reused: boolean }
	try {
		result = await queryClient.begin(async (tx) => {
		const [existing] = await tx`SELECT id, confirmation_code FROM reservations WHERE client_request_id = ${clientRequestId} AND booking_status = 'HOLD' AND created_at > now() - interval '30 minutes'`
		if (existing) return { reservationId: existing.id as string, confirmationCode: existing.confirmation_code as string, reused: true }
		const expiredHolds = await tx`
			SELECT DISTINCT r.id FROM reservations r
			JOIN inventory_days i ON i.reservation_id=r.id
			WHERE r.property_id=${data.propertyId} AND r.booking_status='HOLD' AND i.status='HOLD' AND i.hold_expires_at < now()
			FOR UPDATE
		`
		for (const expired of expiredHolds) {
			const [redemption] = await tx`SELECT id,coupon_id FROM coupon_redemptions WHERE reservation_id=${expired.id} FOR UPDATE`
			if (redemption) {
				await tx`UPDATE coupons SET current_uses=GREATEST(0,current_uses-1) WHERE id=${redemption.coupon_id}`
				await tx`DELETE FROM coupon_redemptions WHERE id=${redemption.id}`
			}
			await tx`UPDATE reservations SET booking_status='CANCELLED',cancelled_at=now(),updated_at=now() WHERE id=${expired.id}`
		}
		await tx`DELETE FROM inventory_days WHERE property_id=${data.propertyId} AND status='HOLD' AND hold_expires_at < now()`
		const conflict = await tx`SELECT 1 FROM inventory_days WHERE property_id=${data.propertyId} AND date >= ${data.checkIn}::date AND date < ${data.checkOut}::date FOR UPDATE`
		if (conflict.length) throw new BookingDomainError("Those dates have just been reserved. Please choose different dates.", 409)
		let couponId: string | null = null
		if (data.couponCode) {
			const [coupon] = await tx`
				SELECT id,discount_type,discount_value FROM coupons
				WHERE upper(code)=upper(${data.couponCode}) AND active=true
					AND (expiration_date IS NULL OR expiration_date >= current_date)
					AND (max_uses IS NULL OR current_uses < max_uses)
				FOR UPDATE
			`
			if (!coupon) throw new BookingDomainError("That coupon is no longer available.", 409)
			const expectedDiscount = coupon.discount_type === "PERCENTAGE" ? Math.floor(quote.subtotal * Number(coupon.discount_value) / 10_000) : Math.min(quote.subtotal, Number(coupon.discount_value))
			if (expectedDiscount !== quote.discount) throw new BookingDomainError("That coupon changed while your quote was being prepared. Please request a new quote.", 409)
			couponId = coupon.id as string
			await tx`UPDATE coupons SET current_uses=current_uses+1 WHERE id=${couponId}`
		}
		await tx`INSERT INTO reservations (id,confirmation_code,property_id,client_request_id,guest_first_name,guest_last_name,guest_email,guest_phone,check_in,check_out,adults,children,total_guests,booking_status,payment_status,currency,subtotal,cleaning_fee,taxes,discount_amount,total_amount,amount_due,price_snapshot) VALUES (${reservationId},${code},${data.propertyId},${clientRequestId},${guest.firstName},${guest.lastName},${guest.email},${guest.phone ?? null},${data.checkIn}::date,${data.checkOut}::date,${data.adults},${data.children},${data.adults + data.children},'HOLD','NOT_STARTED',${quote.currency},${quote.subtotal},${quote.cleaningFee},${quote.taxes},${quote.discount},${quote.total},${quote.total},${JSON.stringify(quote)}::jsonb)`
		if (couponId) await tx`INSERT INTO coupon_redemptions (id,coupon_id,reservation_id,amount) VALUES (${nanoid()},${couponId},${reservationId},${quote.discount})`
		for (let index = 0; index < quote.nights; index++) await tx`INSERT INTO inventory_days (property_id,date,reservation_id,source,status,hold_expires_at) VALUES (${data.propertyId},${addDays(data.checkIn,index)}::date,${reservationId},'DIRECT','HOLD',now() + (${holdMinutes} * interval '1 minute'))`
		await tx`INSERT INTO booking_events (id,reservation_id,event_type,payload) VALUES (${nanoid()},${reservationId},'BOOKING_HOLD_CREATED',${JSON.stringify({ quoteId: quote.quoteId })}::jsonb)`
		return { reservationId, confirmationCode: code, reused: false }
		})
	} catch (error) {
		if (typeof error === "object" && error && "code" in error && error.code === "23505") {
			throw new BookingDomainError("Those dates have just been reserved. Please choose different dates.", 409)
		}
		throw error
	}
	return { ...result, holdExpiresAt: new Date(Date.now() + holdMinutes * 60_000).toISOString(), quote }
}
