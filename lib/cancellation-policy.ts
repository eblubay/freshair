export type CancellationInput = { confirmedAt: Date; checkInAt: Date; requestedAt: Date; nightlyCharges: number; fees: number; taxes: number; amountPaid: number; timezone: string; fullRefundDays: number; partialRefundStartDays: number; partialRefundPercentage: number; lateCancellationRefundPercentage: number; feeRefundConfigured: boolean; taxRefundConfigured: boolean }
export type CancellationQuote = { tier: "CALIFORNIA_24_HOUR" | "FULL" | "PARTIAL" | "LATE"; accommodationRefundAmount: number; feeRefundAmount: number; taxRefundAmount: number; totalRefundAmount: number; californiaGraceEligible: boolean; californiaGraceExpiresAt: Date | null; explanation: string }

const HOUR = 3_600_000
export function calculateCancellation(input: CancellationInput): CancellationQuote {
	const graceEligible = input.confirmedAt.getTime() <= input.checkInAt.getTime() - 72 * HOUR
	const graceExpiresAt = graceEligible ? new Date(input.confirmedAt.getTime() + 24 * HOUR) : null
	const feeRefund = input.feeRefundConfigured ? input.fees : 0
	const taxRefund = input.taxRefundConfigured ? input.taxes : 0
	let tier: CancellationQuote["tier"]; let percentage: number; let explanation: string
	if (graceExpiresAt && input.requestedAt <= graceExpiresAt) { tier = "CALIFORNIA_24_HOUR"; percentage = 100; explanation = "Eligible California 24-hour cancellation right applies." }
	else {
		const hoursBefore = (input.checkInAt.getTime() - input.requestedAt.getTime()) / HOUR
		if (hoursBefore >= input.fullRefundDays * 24) { tier = "FULL"; percentage = 100; explanation = "Cancellation was received at least 14 days before scheduled check-in." }
		else if (hoursBefore >= input.partialRefundStartDays * 24) { tier = "PARTIAL"; percentage = input.partialRefundPercentage; explanation = "Cancellation was received between 7 and less than 14 days before scheduled check-in." }
		else { tier = "LATE"; percentage = input.lateCancellationRefundPercentage; explanation = "Nightly accommodation charges are non-refundable within 7 days of scheduled check-in." }
	}
	const accommodationRefundAmount = Math.floor(input.nightlyCharges * percentage / 100)
	const totalRefundAmount = Math.min(input.amountPaid, accommodationRefundAmount + feeRefund + taxRefund)
	return { tier, accommodationRefundAmount, feeRefundAmount: feeRefund, taxRefundAmount: taxRefund, totalRefundAmount, californiaGraceEligible: graceEligible, californiaGraceExpiresAt: graceExpiresAt, explanation }
}
