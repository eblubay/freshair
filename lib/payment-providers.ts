import "server-only"

import braintree from "braintree"
import Stripe from "stripe"

export type PaymentProviderName = "BRAINTREE" | "STRIPE" | "ACH"

export type ClientPaymentToken = {
	provider: PaymentProviderName
	clientToken?: string
	status: "READY" | "AWAITING_CREDENTIAL" | "DISABLED"
	message?: string
}

function braintreeEnvironment() {
	return process.env.BRAINTREE_ENVIRONMENT === "production"
		? braintree.Environment.Production
		: braintree.Environment.Sandbox
}

export function canUseBraintree() {
	return Boolean(process.env.BRAINTREE_MERCHANT_ID && process.env.BRAINTREE_PUBLIC_KEY && process.env.BRAINTREE_PRIVATE_KEY)
}

export function canUseStripe() { return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) }

export function getStripeClient() {
	if (!canUseStripe()) throw new Error("Stripe credentials are not configured.")
	return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" })
}

export function stripePaymentsAreServerEnabled() {
	return process.env.PAYMENTS_ENABLED === "true" && canUseStripe() && (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") !== true || process.env.PAYMENTS_LIVE_ENABLED === "true")
}

export function getBraintreeGateway() {
	if (!canUseBraintree()) throw new Error("Braintree credentials are not configured.")
	return new braintree.BraintreeGateway({
		environment: braintreeEnvironment(),
		merchantId: process.env.BRAINTREE_MERCHANT_ID!,
		publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
		privateKey: process.env.BRAINTREE_PRIVATE_KEY!
	})
}

export async function createClientPaymentToken(): Promise<ClientPaymentToken> {
	if (process.env.PAYMENTS_ENABLED !== "true" || (process.env.BRAINTREE_ENVIRONMENT === "production" && process.env.PAYMENTS_LIVE_ENABLED !== "true")) {
		return { provider: "BRAINTREE", status: "DISABLED", message: "Online payments are not enabled for this environment." }
	}

	if (!canUseBraintree()) {
		return { provider: "BRAINTREE", status: "AWAITING_CREDENTIAL", message: "Braintree sandbox credentials are required before card checkout can be activated." }
	}

	const gateway = getBraintreeGateway()
	const response = await gateway.clientToken.generate({})
	return { provider: "BRAINTREE", clientToken: response.clientToken, status: "READY" }
}

/**
 * Card numbers never reach this application. The browser submits a Braintree
 * Hosted Fields nonce to the future transaction route, which must also verify
 * reservation state and idempotency before charging.
 */
export function paymentsAreServerEnabled() {
	return process.env.PAYMENTS_ENABLED === "true" && canUseBraintree() && (process.env.BRAINTREE_ENVIRONMENT !== "production" || process.env.PAYMENTS_LIVE_ENABLED === "true")
}
