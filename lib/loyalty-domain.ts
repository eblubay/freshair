import "server-only"

import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"

function code(prefix: string) { return `${prefix}-${nanoid(10).toUpperCase()}` }

export async function rewardCompletedStay(reservationId: string) {
	return queryClient.begin(async (tx) => {
		const [reservation] = await tx`SELECT r.id,r.property_id,r.guest_email FROM reservations r WHERE r.id=${reservationId} AND r.booking_status='COMPLETED' FOR UPDATE`
		if (!reservation) return { rewarded: false, reason: "NOT_COMPLETED" }
		const [settings] = await tx`SELECT * FROM loyalty_settings WHERE property_id=${reservation.property_id} AND enabled=true AND welcome_back_enabled=true FOR UPDATE`
		if (!settings?.discount_type || !settings.discount_value) return { rewarded: false, reason: "NOT_CONFIGURED" }
		const [existing] = await tx`SELECT id,code FROM coupons WHERE source_reservation_id=${reservationId} AND created_reason='WELCOMEBACK'`
		if (existing) return { rewarded: true, duplicate: true, couponCode: existing.code as string }
		const couponCode = code("WELCOMEBACK")
		await tx`INSERT INTO coupons (id,code,discount_type,discount_value,expiration_date,max_uses,created_for_guest_email,active,created_reason,source_reservation_id) VALUES (${nanoid()},${couponCode},${settings.discount_type},${settings.discount_value},${settings.expiration_days ? new Date(Date.now() + Number(settings.expiration_days) * 86_400_000).toISOString().slice(0, 10) : null}::date,${settings.max_uses},${reservation.guest_email},true,'WELCOMEBACK',${reservationId})`
		return { rewarded: true, duplicate: false, couponCode }
	})
}

export async function createReferral(reservationId: string) {
	return queryClient.begin(async (tx) => {
		const [reservation] = await tx`SELECT id,property_id,guest_email FROM reservations WHERE id=${reservationId} AND booking_status='COMPLETED' FOR UPDATE`
		if (!reservation) return { created: false, reason: "NOT_COMPLETED" }
		const [settings] = await tx`SELECT referral_enabled FROM loyalty_settings WHERE property_id=${reservation.property_id}`
		if (!settings?.referral_enabled) return { created: false, reason: "NOT_ENABLED" }
		const [existing] = await tx`SELECT referral_code FROM referrals WHERE source_reservation_id=${reservationId}`
		if (existing) return { created: true, duplicate: true, referralCode: existing.referral_code as string }
		const referralCode = code("REFER")
		await tx`INSERT INTO referrals (id,referrer_email,referral_code,source_reservation_id,status) VALUES (${nanoid()},${reservation.guest_email},${referralCode},${reservationId},'CREATED')`
		return { created: true, duplicate: false, referralCode }
	})
}
