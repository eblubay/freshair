import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
	propertyId: z.string().min(1),
	booking: z.object({ directBookingEnabled: z.boolean(), baseNightlyRate: z.coerce.number().int().min(0), cleaningFee: z.coerce.number().int().min(0), taxRateBasisPoints: z.coerce.number().int().min(0).max(10000), minStayNights: z.coerce.number().int().min(1).max(90), maxStayNights: z.coerce.number().int().min(1).max(365), minBookingLeadHours: z.coerce.number().int().min(0).max(720), checkinTime: z.string().max(10).nullable(), checkoutTime: z.string().max(10).nullable(), holdMinutes: z.coerce.number().int().min(5).max(30), secretReleaseHours: z.coerce.number().int().min(0).max(720) }),
	payment: z.object({ provider: z.enum(["BRAINTREE", "STRIPE"]), sandboxEnabled: z.boolean(), liveEnabled: z.boolean(), cardEnabled: z.boolean(), achEnabled: z.boolean(), stripeEnabled: z.boolean() }),
	cleaning: z.object({ enabled: z.boolean(), reminderHours: z.coerce.number().int().min(0).max(168), urgentReminderMinutes: z.coerce.number().int().min(0).max(1440), escalationHours: z.coerce.number().int().min(0).max(168) }),
	loyalty: z.object({ enabled: z.boolean(), welcomeBackEnabled: z.boolean(), discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable(), discountValue: z.coerce.number().int().min(0).nullable(), expirationDays: z.coerce.number().int().min(1).max(3650).nullable(), maxUses: z.coerce.number().int().min(1).max(1000).nullable(), referralEnabled: z.boolean() })
})

async function ownerProperty(propertyId: string, userId: string) { const [row] = await queryClient`SELECT id FROM properties WHERE id=${propertyId} AND clerk_id=${userId}`; return Boolean(row) }

export async function PUT(request: Request) {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } })
	try {
		const data = schema.parse(await request.json())
		if (!await ownerProperty(data.propertyId, userId)) return NextResponse.json({ error: "Property not found." }, { status: 404, headers: { "Cache-Control": "no-store" } })
		if (data.booking.maxStayNights < data.booking.minStayNights) return NextResponse.json({ error: "Maximum stay must be at least the minimum stay." }, { status: 400, headers: { "Cache-Control": "no-store" } })
		await queryClient.begin(async (tx) => {
			await tx`UPDATE booking_settings SET direct_booking_enabled=${data.booking.directBookingEnabled},base_nightly_rate=${data.booking.baseNightlyRate},cleaning_fee=${data.booking.cleaningFee},tax_rate_basis_points=${data.booking.taxRateBasisPoints},min_stay_nights=${data.booking.minStayNights},max_stay_nights=${data.booking.maxStayNights},min_booking_lead_hours=${data.booking.minBookingLeadHours},checkin_time=${data.booking.checkinTime},checkout_time=${data.booking.checkoutTime},booking_hold_minutes=${data.booking.holdMinutes},guest_secret_release_hours=${data.booking.secretReleaseHours},updated_at=now() WHERE property_id=${data.propertyId}`
			await tx`INSERT INTO payment_settings (property_id,provider,sandbox_enabled,live_enabled,card_enabled,ach_enabled,stripe_enabled) VALUES (${data.propertyId},${data.payment.provider},${data.payment.sandboxEnabled},${data.payment.liveEnabled},${data.payment.cardEnabled},${data.payment.achEnabled},${data.payment.stripeEnabled}) ON CONFLICT (property_id) DO UPDATE SET provider=EXCLUDED.provider,sandbox_enabled=EXCLUDED.sandbox_enabled,live_enabled=EXCLUDED.live_enabled,card_enabled=EXCLUDED.card_enabled,ach_enabled=EXCLUDED.ach_enabled,stripe_enabled=EXCLUDED.stripe_enabled,updated_at=now()`
			await tx`INSERT INTO cleaning_settings (property_id,enabled,reminder_hours_before_deadline,urgent_reminder_minutes,host_escalation_hours) VALUES (${data.propertyId},${data.cleaning.enabled},${data.cleaning.reminderHours},${data.cleaning.urgentReminderMinutes},${data.cleaning.escalationHours}) ON CONFLICT (property_id) DO UPDATE SET enabled=EXCLUDED.enabled,reminder_hours_before_deadline=EXCLUDED.reminder_hours_before_deadline,urgent_reminder_minutes=EXCLUDED.urgent_reminder_minutes,host_escalation_hours=EXCLUDED.host_escalation_hours,updated_at=now()`
			await tx`INSERT INTO loyalty_settings (property_id,enabled,welcome_back_enabled,discount_type,discount_value,expiration_days,max_uses,referral_enabled) VALUES (${data.propertyId},${data.loyalty.enabled},${data.loyalty.welcomeBackEnabled},${data.loyalty.discountType},${data.loyalty.discountValue},${data.loyalty.expirationDays},${data.loyalty.maxUses},${data.loyalty.referralEnabled}) ON CONFLICT (property_id) DO UPDATE SET enabled=EXCLUDED.enabled,welcome_back_enabled=EXCLUDED.welcome_back_enabled,discount_type=EXCLUDED.discount_type,discount_value=EXCLUDED.discount_value,expiration_days=EXCLUDED.expiration_days,max_uses=EXCLUDED.max_uses,referral_enabled=EXCLUDED.referral_enabled,updated_at=now()`
		})
		return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } })
	} catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save settings." }, { status: 400, headers: { "Cache-Control": "no-store" } }) }
}
