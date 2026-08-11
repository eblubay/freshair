import "server-only"
import { calculateCancellation } from "@/lib/cancellation-policy"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"

export async function requestCancellation(reservationId: string, requestedAt = new Date()) {
	return queryClient.begin(async (tx) => {
		const [reservation] = await tx`
			SELECT r.*,b.timezone,b.full_refund_days,b.partial_refund_start_days,b.partial_refund_percentage,b.late_cancellation_refund_percentage,b.refundable_fee_policy_configured,b.refundable_tax_policy_configured
			FROM reservations r JOIN booking_settings b ON b.property_id=r.property_id
			WHERE r.id=${reservationId} FOR UPDATE
		`
		if (!reservation?.confirmed_at || !reservation.scheduled_checkin_at) throw new Error("Only confirmed reservations with a scheduled check-in can be evaluated.")
		const quote = calculateCancellation({ confirmedAt: new Date(String(reservation.confirmed_at)), checkInAt: new Date(String(reservation.scheduled_checkin_at)), requestedAt, nightlyCharges: Number(reservation.subtotal), fees: Number(reservation.cleaning_fee), taxes: Number(reservation.taxes), amountPaid: Number(reservation.amount_paid), timezone: String(reservation.timezone), fullRefundDays: Number(reservation.full_refund_days), partialRefundStartDays: Number(reservation.partial_refund_start_days), partialRefundPercentage: Number(reservation.partial_refund_percentage), lateCancellationRefundPercentage: Number(reservation.late_cancellation_refund_percentage), feeRefundConfigured: Boolean(reservation.refundable_fee_policy_configured), taxRefundConfigured: Boolean(reservation.refundable_tax_policy_configured) })
		await tx`UPDATE reservations SET california_grace_period_eligible=${quote.californiaGraceEligible},california_grace_period_expires_at=${quote.californiaGraceExpiresAt?.toISOString() ?? null} WHERE id=${reservationId}`
		await tx`INSERT INTO cancellation_requests (id,reservation_id,requested_at,tier,accommodation_refund_amount,fee_refund_amount,tax_refund_amount,total_refund_amount,explanation) VALUES (${nanoid()},${reservationId},${requestedAt.toISOString()},${quote.tier},${quote.accommodationRefundAmount},${quote.feeRefundAmount},${quote.taxRefundAmount},${quote.totalRefundAmount},${quote.explanation})`
		return quote
	})
}
