import "server-only"

import { queryClient } from "@/lib/db"
import { getFromEmail, getTransporter, isSmtpConfigured } from "@/lib/postmark"
import { nanoid } from "nanoid"

type Reward = {
	rewarded: boolean
	duplicate?: boolean
	reason?: string
	couponCode?: string
	email?: string
	eventType?: string
}

function code(prefix: string) {
	return `${prefix}-${nanoid(10).toUpperCase()}`
}

function expiration(days: unknown) {
	return days
		? new Date(Date.now() + Number(days) * 86_400_000).toISOString().slice(0, 10)
		: null
}

async function deliverRewardEmail(reward: Reward) {
	if (!reward.rewarded || reward.duplicate || !reward.email || !reward.couponCode) {
		return "NOT_REQUESTED"
	}
	if (!isSmtpConfigured()) return "NOT_CONFIGURED"

	const title = reward.eventType === "REFERRAL_REWARDED" ? "Your referral reward" : "Your welcome-back reward"
	try {
		await getTransporter().sendMail({
			from: getFromEmail(),
			to: reward.email,
			subject: title,
			text: `Thank you for staying with Shell By The Shore. Your reward code is ${reward.couponCode}. Apply it during a future direct booking before it expires.`
		})
		return "SENT"
	} catch {
		return "FAILED"
	}
}

export async function rewardCompletedStay(reservationId: string): Promise<Reward> {
	return queryClient.begin(async (tx) => {
		const [reservation] = await tx`
			SELECT id,property_id,guest_email,payment_status
			FROM reservations
			WHERE id=${reservationId} AND booking_status='COMPLETED'
			FOR UPDATE
		`
		if (!reservation || ["REFUNDED", "PARTIALLY_REFUNDED"].includes(String(reservation?.payment_status))) {
			return { rewarded: false, reason: "NOT_ELIGIBLE" }
		}
		const [settings] = await tx`
			SELECT * FROM loyalty_settings
			WHERE property_id=${reservation.property_id} AND enabled=true AND welcome_back_enabled=true
			FOR UPDATE
		`
		if (!settings?.discount_type || !settings.discount_value) return { rewarded: false, reason: "NOT_CONFIGURED" }
		const [existing] = await tx`SELECT code FROM coupons WHERE source_reservation_id=${reservationId} AND created_reason='WELCOMEBACK' FOR UPDATE`
		if (existing) return { rewarded: true, duplicate: true, couponCode: String(existing.code) }

		const couponCode = code("WELCOMEBACK")
		await tx`
			INSERT INTO coupons (id,code,discount_type,discount_value,expiration_date,max_uses,created_for_guest_email,active,created_reason,source_reservation_id)
			VALUES (${nanoid()},${couponCode},${settings.discount_type},${settings.discount_value},${expiration(settings.expiration_days)}::date,${settings.max_uses},${reservation.guest_email},true,'WELCOMEBACK',${reservationId})
		`
		await tx`INSERT INTO audit_events (id,actor_type,event_type,reservation_id,metadata) VALUES (${nanoid()},'SYSTEM','LOYALTY_WELCOMEBACK_CREATED',${reservationId},'{}'::jsonb)`
		const reward = { rewarded: true, couponCode, email: String(reservation.guest_email), eventType: "LOYALTY_WELCOMEBACK_CREATED" }
		const delivery = await deliverRewardEmail(reward)
		if (delivery !== "NOT_REQUESTED") await tx`INSERT INTO audit_events (id,actor_type,event_type,reservation_id,metadata) VALUES (${nanoid()},'SYSTEM','LOYALTY_WELCOMEBACK_EMAIL',${reservationId},${JSON.stringify({ delivery })}::jsonb)`
		return reward
	})
}

export async function createReferral(reservationId: string) {
	return queryClient.begin(async (tx) => {
		const [reservation] = await tx`
			SELECT id,property_id,guest_email,payment_status FROM reservations
			WHERE id=${reservationId} AND booking_status='COMPLETED' FOR UPDATE
		`
		if (!reservation || ["REFUNDED", "PARTIALLY_REFUNDED"].includes(String(reservation?.payment_status))) return { created: false, reason: "NOT_ELIGIBLE" }
		const [settings] = await tx`SELECT referral_enabled FROM loyalty_settings WHERE property_id=${reservation.property_id} AND enabled=true FOR UPDATE`
		if (!settings?.referral_enabled) return { created: false, reason: "NOT_ENABLED" }
		const [existing] = await tx`SELECT referral_code FROM referrals WHERE source_reservation_id=${reservationId} FOR UPDATE`
		if (existing) return { created: true, duplicate: true, referralCode: String(existing.referral_code) }
		const referralCode = code("REFER")
		await tx`INSERT INTO referrals (id,referrer_email,referral_code,source_reservation_id,status) VALUES (${nanoid()},${reservation.guest_email},${referralCode},${reservationId},'CREATED')`
		await tx`INSERT INTO audit_events (id,actor_type,event_type,reservation_id,metadata) VALUES (${nanoid()},'SYSTEM','REFERRAL_CREATED',${reservationId},'{}'::jsonb)`
		return { created: true, duplicate: false, referralCode }
	})
}

export async function qualifyReferral(reservationId: string): Promise<Reward> {
	return queryClient.begin(async (tx) => {
		const [reservation] = await tx`
			SELECT id,property_id,guest_email,payment_status FROM reservations
			WHERE id=${reservationId} FOR UPDATE
		`
		if (!reservation) {
			return { rewarded: false, reason: "NO_RESERVATION" }
		}
		const [referral] = await tx`
			SELECT * FROM referrals WHERE qualifying_reservation_id=${reservationId} FOR UPDATE
		`
		if (reservation.booking_status !== "COMPLETED" || ["REFUNDED", "PARTIALLY_REFUNDED"].includes(String(reservation.payment_status))) {
			if (referral && referral.status === "PENDING") {
				await tx`UPDATE referrals SET status='REJECTED',rejected_at=now(),rejection_reason='STAY_NOT_ELIGIBLE' WHERE id=${referral.id}`
				await tx`INSERT INTO audit_events (id,actor_type,event_type,reservation_id,metadata) VALUES (${nanoid()},'SYSTEM','REFERRAL_REJECTED',${reservationId},'{}'::jsonb)`
			}
			return { rewarded: false, reason: "NOT_ELIGIBLE" }
		}
		if (!referral) return { rewarded: false, reason: "NO_REFERRAL" }
		if (referral.status === "REWARDED") return { rewarded: true, duplicate: true }
		if (referral.status !== "PENDING" || String(referral.referred_email).toLowerCase() !== String(reservation.guest_email).toLowerCase()) {
			await tx`UPDATE referrals SET status='REJECTED',rejected_at=now(),rejection_reason='INVALID_QUALIFICATION' WHERE id=${referral.id}`
			return { rewarded: false, reason: "REJECTED" }
		}
		const [settings] = await tx`
			SELECT * FROM loyalty_settings WHERE property_id=${reservation.property_id} AND enabled=true AND referral_enabled=true FOR UPDATE
		`
		if (!settings?.referral_discount_type || !settings.referral_discount_value) return { rewarded: false, reason: "NOT_CONFIGURED" }
		await tx`UPDATE referrals SET status='QUALIFIED',qualified_at=now() WHERE id=${referral.id}`
		const couponCode = code("REFERRAL")
		const couponId = nanoid()
		await tx`
			INSERT INTO coupons (id,code,discount_type,discount_value,expiration_date,max_uses,created_for_guest_email,active,created_reason,source_reservation_id)
			VALUES (${couponId},${couponCode},${settings.referral_discount_type},${settings.referral_discount_value},${expiration(settings.referral_expiration_days)}::date,1,${referral.referrer_email},true,'REFERRAL',${reservationId})
		`
		await tx`UPDATE referrals SET status='REWARDED',reward_coupon_id=${couponId},rewarded_at=now() WHERE id=${referral.id}`
		await tx`INSERT INTO audit_events (id,actor_type,event_type,reservation_id,metadata) VALUES (${nanoid()},'SYSTEM','REFERRAL_REWARDED',${reservationId},'{}'::jsonb)`
		const reward = { rewarded: true, couponCode, email: String(referral.referrer_email), eventType: "REFERRAL_REWARDED" }
		const delivery = await deliverRewardEmail(reward)
		if (delivery !== "NOT_REQUESTED") await tx`INSERT INTO audit_events (id,actor_type,event_type,reservation_id,metadata) VALUES (${nanoid()},'SYSTEM','REFERRAL_REWARD_EMAIL',${reservationId},${JSON.stringify({ delivery })}::jsonb)`
		return reward
	})
}
