"use client"

import { useEffect, useRef, useState } from "react"

type BraintreeCheckoutProps = {
	reservationId: string
	onSuccess: (confirmationCode: string) => void
}

type ClientTokenResponse = {
	provider: "BRAINTREE"
	clientToken?: string
	status: "READY" | "AWAITING_CREDENTIAL" | "DISABLED"
	message?: string
}

type HostedFieldsInstance = {
	tokenize: () => Promise<{ nonce: string }>
	teardown: () => Promise<void>
}

type BraintreeWeb = {
	client: { create: (options: { authorization: string }) => Promise<unknown> }
	hostedFields: {
		create: (options: {
			client: unknown
			styles: Record<string, Record<string, string>>
			fields: Record<string, { selector: string; placeholder: string }>
		}) => Promise<HostedFieldsInstance>
	}
}

export function BraintreeCheckout({ reservationId, onSuccess }: BraintreeCheckoutProps) {
	const hostedFields = useRef<HostedFieldsInstance | null>(null)
	const [state, setState] = useState<"loading" | "ready" | "unavailable" | "paying" | "error">("loading")
	const [message, setMessage] = useState("Preparing secure card fields…")

	useEffect(() => {
		let active = true
		async function initialise() {
			try {
				const tokenResponse = await fetch("/api/payments/client-token", { method: "POST", cache: "no-store" })
				const token = (await tokenResponse.json()) as ClientTokenResponse
				if (!tokenResponse.ok || token.status !== "READY" || !token.clientToken) {
					if (active) {
						setMessage(token.message ?? "Card checkout is not configured yet.")
						setState("unavailable")
					}
					return
				}

				const braintree = (await import("braintree-web")) as unknown as BraintreeWeb
				const client = await braintree.client.create({ authorization: token.clientToken })
				const fields = await braintree.hostedFields.create({
					client,
					styles: {
						input: { "font-size": "16px", color: "#28323b" },
						":focus": { color: "#28323b" },
						".invalid": { color: "#b33939" }
					},
					fields: {
						number: { selector: "#braintree-card-number", placeholder: "Card number" },
						expirationDate: { selector: "#braintree-expiration-date", placeholder: "MM / YY" },
						cvv: { selector: "#braintree-cvv", placeholder: "CVV" }
					}
				})
				if (!active) {
					void fields.teardown()
					return
				}
				hostedFields.current = fields
				setState("ready")
				setMessage("")
			} catch {
				if (active) {
					setMessage("Secure card fields could not be prepared. Please use the availability request below.")
					setState("unavailable")
				}
			}
		}
		void initialise()
		return () => {
			active = false
			if (hostedFields.current) void hostedFields.current.teardown()
		}
	}, [])

	async function pay() {
		if (!hostedFields.current) return
		setState("paying")
		setMessage("")
		try {
			const { nonce } = await hostedFields.current.tokenize()
			const response = await fetch("/api/payments/braintree/capture", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reservationId, paymentMethodNonce: nonce, idempotencyKey: crypto.randomUUID() })
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.error ?? "Your payment could not be authorized.")
			onSuccess(data.confirmationCode ?? "confirmed")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Your payment could not be authorized.")
			setState("ready")
		}
	}

	if (state === "unavailable") return <p className="mt-5 text-sm leading-relaxed text-[#5d6b78]">{message}</p>
	const field = "h-12 border border-[#d8cdba] bg-white px-3 py-3 text-sm text-[#28323b]"
	return <div className="mt-5 border-t border-[#e6ddcf] pt-5"><p className="text-[11px] uppercase tracking-[.18em] text-[#8d7c66]">Secure card payment</p><p className="mt-2 text-sm leading-relaxed text-[#5d6b78]">Card details are entered directly into Braintree’s hosted fields and never pass through ShellByTheShore.</p><div className="mt-4 grid gap-3"><div id="braintree-card-number" className={field}/><div className="grid grid-cols-2 gap-3"><div id="braintree-expiration-date" className={field}/><div id="braintree-cvv" className={field}/></div></div>{message && <p role="alert" className="mt-3 text-sm text-[#b33939]">{message}</p>}<button type="button" disabled={state !== "ready"} onClick={pay} className="mt-4 w-full bg-[#c2683f] px-5 py-3 text-xs uppercase tracking-[.16em] text-white disabled:opacity-60">{state === "loading" ? "Loading secure payment…" : state === "paying" ? "Authorizing payment…" : "Pay and confirm booking"}</button></div>
}
