"use client"

import { useCallback, useEffect, useState } from "react"

type Status = {
	telegramConfigured: boolean
	webhookConfigured: boolean
	webhookUrl: string
	pending_update_count: number
	last_error_date: number | null
	last_error_message: string | null
}

export function TelegramWebhookControl() {
	const [status, setStatus] = useState<Status | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const refresh = useCallback(async () => {
		setLoading(true); setError(null)
		try {
			const response = await fetch("/api/internal/telegram/webhook-status", { cache: "no-store" })
			const payload = await response.json()
			if (!response.ok) throw new Error(payload.error || payload.last_error_message || "Status request failed")
			setStatus(payload)
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Status request failed") }
		finally { setLoading(false) }
	}, [])
	useEffect(() => { void refresh() }, [refresh])
	async function configure() {
		setLoading(true); setError(null)
		try {
			const response = await fetch("/api/internal/telegram/setup-webhook", { method: "POST" })
			const payload = await response.json()
			if (!response.ok) throw new Error(payload.error || "Webhook setup failed")
			setStatus(payload)
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Webhook setup failed") }
		finally { setLoading(false) }
	}
	const connection = error ? "ERROR" : status?.webhookConfigured ? "CONNECTED" : "NOT CONNECTED"
	return <section className="mt-10 max-w-3xl rounded-2xl border border-[#dfd6c8] bg-white p-6 shadow-sm">
		<p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#8d7c66]">Telegram Host Bot</p>
		<div className="mt-5 grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
			<strong>Bot configured:</strong><span>{status?.telegramConfigured ? "YES" : "NO"}</span>
			<strong>Webhook:</strong><span>{connection}</span>
			<strong>Webhook URL:</strong><span className="break-all">{status?.webhookUrl || "Not available"}</span>
			<strong>Pending updates:</strong><span>{status?.pending_update_count ?? "—"}</span>
			<strong>Last Telegram error:</strong><span>{status?.last_error_message || error || "None"}</span>
		</div>
		<div className="mt-6 flex flex-wrap gap-3">
			<button type="button" disabled={loading} onClick={configure} className="rounded-full bg-[#28323b] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50">Configure / Repair Telegram Webhook</button>
			<button type="button" disabled={loading} onClick={() => void refresh()} className="rounded-full border border-[#28323b] px-5 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-50">Refresh Status</button>
		</div>
	</section>
}
