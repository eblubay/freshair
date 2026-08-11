"use client"

import { useEffect, useRef, useState } from "react"

type StripeCheckoutProps = {
	reservationId: string
	onSuccess: (confirmationCode: string) => void
}

type StripeElements = {
	create: (type: "payment", options?: { layout?: "tabs" }) => {
		mount: (selector: string) => void
		unmount: () => void
	}
}

type StripeClient = {
	elements: (options: { clientSecret: string; appearance: { theme: "stripe"; variables: Record<string, string> } }) => StripeElements
	confirmPayment: (options: { elements: StripeElements; confirmParams: { return_url: string }; redirect: "if_required" }) => Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status: string } }>
}

export function StripeCheckout({ reservationId, onSuccess }: StripeCheckoutProps) {
	const [state, setState] = useState<"loading" | "ready" | "unavailable" | "paying" | "error">("loading")
	const [message, setMessage] = useState("Preparing secure card fields…")
	const stripe = useRef<StripeClient | null>(null)
	const elements = useRef<StripeElements | null>(null)
	const paymentElement = useRef<{ unmount: () => void } | null>(null)

	useEffect(() => {
		let active = true
		async function initialise() {
			try {
				const response = await fetch("/api/payments/stripe/intent", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ reservationId, idempotencyKey: crypto.randomUUID() }),
					cache: "no-store"
				})
				const data = await response.json()
				if (!response.ok || !data.clientSecret) throw new Error(data.error ?? "Stripe card checkout is not configured yet.")
				const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
				if (!publishableKey) throw new Error("Stripe card checkout is not configured yet.")
				const { loadStripe } = await import("@stripe/stripe-js")
				const client = await loadStripe(publishableKey)
				if (!client || !active) return
				const stripeClient = client as unknown as StripeClient
				const stripeElements = stripeClient.elements({
					clientSecret: data.clientSecret,
					appearance: { theme: "stripe", variables: { colorPrimary: "#c2683f", colorText: "#28323b", borderRadius: "0px" } }
				})
				const element = stripeElements.create("payment", { layout: "tabs" })
				element.mount("#stripe-payment-element")
				stripe.current = stripeClient
				elements.current = stripeElements
				paymentElement.current = element
				setMessage("")
				setState("ready")
			} catch (error) {
				if (active) {
					setMessage(error instanceof Error ? error.message : "Stripe card checkout is not configured yet.")
					setState("unavailable")
				}
			}
		}
		void initialise()
		return () => {
			active = false
			paymentElement.current?.unmount()
		}
	}, [reservationId])

	async function pay() {
		if (!stripe.current || !elements.current) return
		setState("paying")
		setMessage("")
		try {
			const result = await stripe.current.confirmPayment({
				elements: elements.current,
				confirmParams: { return_url: `${window.location.origin}/guest` },
				redirect: "if_required"
			})
			if (result.error) throw new Error(result.error.message ?? "Your payment could not be authorized.")
			if (result.paymentIntent?.status !== "succeeded") throw new Error("Your payment is still pending confirmation.")
			const confirmation = await fetch("/api/payments/stripe/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId, paymentIntentId: result.paymentIntent.id }) })
			const data = await confirmation.json()
			if (!confirmation.ok || !data.confirmed) throw new Error(data.error ?? "Your payment was received but booking confirmation is still pending.")
			onSuccess("confirmed")
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Your payment could not be authorized.")
			setState("ready")
		}
	}

	if (state === "unavailable") return <p className="mt-5 text-sm leading-relaxed text-[#5d6b78]">{message}</p>
	return <div className="mt-5 border-t border-[#e6ddcf] pt-5"><p className="text-[11px] uppercase tracking-[.18em] text-[#8d7c66]">Secure card payment</p><p className="mt-2 text-sm leading-relaxed text-[#5d6b78]">Card details are entered directly into Stripe’s Payment Element and never pass through ShellByTheShore.</p><div id="stripe-payment-element" className="mt-4 min-h-12"/>{message && <p role="alert" className="mt-3 text-sm text-[#b33939]">{message}</p>}<button type="button" disabled={state !== "ready"} onClick={pay} className="mt-4 w-full bg-[#c2683f] px-5 py-3 text-xs uppercase tracking-[.16em] text-white disabled:opacity-60">{state === "loading" ? "Loading secure payment…" : state === "paying" ? "Authorizing payment…" : "Pay and confirm booking"}</button></div>
}
