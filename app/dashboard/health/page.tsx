"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Status = "READY" | "DEGRADED" | "ERROR" | "NOT_CONFIGURED" | "DISABLED_BY_DESIGN" | "NOT_REQUIRED" | "OPTIONAL"
type Check = { status: Status; detail: string }

const tone: Record<Status, string> = {
	READY: "bg-[#e7f1e8] text-[#28603a]",
	NOT_CONFIGURED: "bg-[#f2eee7] text-[#766b5b]",
	DISABLED_BY_DESIGN: "bg-[#f2eee7] text-[#766b5b]",
	NOT_REQUIRED: "bg-[#f2eee7] text-[#766b5b]",
	OPTIONAL: "bg-[#f2eee7] text-[#766b5b]",
	DEGRADED: "bg-[#fbefd9] text-[#8b5d20]",
	ERROR: "bg-[#f8e3e3] text-[#a23939]"
}

export default function HealthDashboardPage() {
	const [checks, setChecks] = useState<Record<string, Check> | null>(null)
	const [error, setError] = useState<string | null>(null)
	useEffect(() => {
		void fetch("/api/health", { cache: "no-store" }).then(async (response) => {
			const data = await response.json()
			if (!response.ok) throw new Error(data.error ?? "Unable to load health status.")
			setChecks(data.checks)
		}).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load health status."))
	}, [])
	return <main className="min-h-screen bg-[#fdfbf7] px-5 py-14 text-[#28323b] sm:px-8 lg:px-14"><Link href="/dashboard" className="text-sm underline underline-offset-4">← Owner dashboard</Link><p className="mt-10 text-[11px] uppercase tracking-[.24em] text-[#8d7c66]">Private operations</p><h1 className="mt-3 font-serif text-5xl">System health</h1><p className="mt-4 max-w-3xl leading-relaxed text-[#5d6b78]">Operational services use durable evidence. Optional, not-required, and intentionally disabled capabilities are neutral and do not indicate a launch failure.</p>{error && <p role="alert" className="mt-8 text-sm text-[#b33939]">{error}</p>}{!checks && !error && <p className="mt-8 text-sm text-[#5d6b78]">Loading private health checks…</p>}{checks && <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(checks).map(([name, check]) => <article key={name} className="border border-[#e6ddcf] bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium capitalize">{name.replace(/([A-Z])/g, " $1")}</h2><span className={`px-2 py-1 text-[10px] font-semibold tracking-[.12em] ${tone[check.status]}`}>{check.status.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm leading-relaxed text-[#5d6b78]">{check.detail}</p></article>)}</div>}</main>
}
