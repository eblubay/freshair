"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ConciergeMap } from "@/app/_components/ConciergeMap"
import type { ConciergeMapPayload } from "@/lib/local-places-types"

const SUGGESTION_GROUPS = [
	["What should we do in Manhattan Beach today?", "Where should we eat nearby?", "How should we get here from LAX?", "What can we do with kids?", "What beaches should we visit?", "Plan a Malibu day trip", "What amenities are at the home?"],
	["Plan a day in Santa Monica and Venice", "Where can we get breakfast and coffee?", "Plan Hermosa and Redondo for us", "Is there parking at the home?", "What beach gear is provided?", "What are the quiet hours?", "Help us plan a romantic afternoon"],
	["Plan three hours before dinner", "Which groceries are nearby?", "What should first-time guests know?", "Is the home suitable for stairs?", "What should we do on a rainy day?", "Rental car or rideshare from LAX?", "How does Request Availability work?"]
] as const
type Message = { role: "user" | "assistant"; content: string; links?: { id: string; label: string; href: string }[]; map?: ConciergeMapPayload }
type UiState = "idle" | "typing" | "sending" | "answering" | "answered" | "safe-fallback" | "temporarily-unavailable"

export function Concierge() {
	const [open, setOpen] = useState(false)
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState("")
	const [state, setState] = useState<UiState>("idle")
	const dialog = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const suggestions = useMemo(() => SUGGESTION_GROUPS[new Date().getUTCDate() % SUGGESTION_GROUPS.length], [])
	const loading = state === "sending" || state === "answering"

	useEffect(() => {
		if (!open) return
		const previous = document.activeElement as HTMLElement | null
		inputRef.current?.focus()
		const keydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") { setOpen(false); return }
			if (event.key !== "Tab" || !dialog.current) return
			const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')]
			if (!focusable.length) return
			const first = focusable[0]; const last = focusable[focusable.length - 1]
			if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
			else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
		}
		document.addEventListener("keydown", keydown)
		return () => { document.removeEventListener("keydown", keydown); (previous ?? triggerRef.current)?.focus() }
	}, [open])

	async function ask(raw: string) {
		const question = raw.trim()
		if (!question || loading) return
		const history = messages.slice(-8).map(({ role, content }) => ({ role, content }))
		setMessages((items) => [...items, { role: "user", content: question }]); setInput(""); setState("sending")
		try {
			setState("answering")
			const response = await fetch("/api/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, history }) })
			const result = await response.json() as { answer?: string; state?: UiState; links?: Message["links"]; map?: ConciergeMapPayload }
			if (!response.ok && response.status >= 500) throw new Error("temporarily unavailable")
			setMessages((items) => [...items, { role: "assistant", content: result.answer ?? "I don't have a verified answer for that yet. The host can confirm it.", links: result.links, map: result.map }])
			setState(result.state ?? "answered")
		} catch {
			setInput(question)
			setMessages((items) => [...items, { role: "assistant", content: "I’m having trouble connecting right now. Your question is still in the box, and the Local Guide remains available." }])
			setState("temporarily-unavailable")
		}
	}

	return <>
		<button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center bg-[#c2683f] px-6 py-4 text-[11px] uppercase tracking-[.16em] text-white shadow-[0_10px_24px_rgba(194,104,63,.22)] transition-colors hover:bg-[#a9502c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c2683f] sm:px-7">✨ Ask ShellByTheShore AI</button>
		{open && <div className="fixed inset-0 z-[110] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false) }}>
			<div ref={dialog} className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden bg-[#fdfbf7] shadow-2xl sm:max-h-[85vh]" role="dialog" aria-modal="true" aria-labelledby="concierge-title">
				<div className="flex items-start justify-between border-b border-[#e6ddcf] p-5 sm:p-7"><div><p className="text-[11px] uppercase tracking-[.22em] text-[#c2683f]">Your Local AI Concierge</p><h2 id="concierge-title" className="mt-2 font-serif text-3xl sm:text-4xl">Ask ShellByTheShore</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close concierge" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-2xl transition-colors hover:bg-[#f1e4d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2683f]">×</button></div>
				<div className="min-h-[250px] flex-1 space-y-4 overflow-y-auto p-5 sm:p-7" aria-live="polite" aria-busy={loading}>
					{messages.length === 0 && <><p className="text-[15px] leading-relaxed text-[#5d6b78]">Thoughtful local help for shaping your South Bay stay. For live hours, availability, or traffic, always check directly before heading out.</p><div className="flex flex-wrap gap-2">{suggestions.map((prompt) => <button type="button" key={prompt} onClick={() => void ask(prompt)} className="min-h-10 border border-[#d8cdba] bg-white px-3 py-2 text-left text-sm leading-snug text-[#3d4b57] transition-colors hover:border-[#c2683f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2683f]">{prompt}</button>)}</div></>}
					{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[88%] bg-[#28323b] p-4 text-sm leading-relaxed text-white" : "max-w-[94%] border border-[#e6ddcf] bg-white p-4 text-sm leading-relaxed text-[#3d4b57]"}><div className="whitespace-pre-wrap">{message.content}</div>{message.map?.active ? <ConciergeMap payload={message.map}/> : null}{message.links?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.links.map((link) => <Link key={link.id} href={link.href} className="text-xs font-medium text-[#a9502c] underline underline-offset-4" onClick={() => setOpen(false)}>{link.label}</Link>)}</div> : null}</div>)}
					{loading && <p className="text-sm text-[#8d7c66]" role="status">Preparing a grounded answer…</p>}
				</div>
				<form className="border-t border-[#e6ddcf] p-5 sm:p-7" onSubmit={(event) => { event.preventDefault(); void ask(input) }}><label htmlFor="concierge-question" className="sr-only">Ask the local concierge</label><div className="flex gap-2"><input ref={inputRef} id="concierge-question" value={input} maxLength={1000} onChange={(event) => { setInput(event.target.value); if (!loading) setState(event.target.value ? "typing" : "idle") }} placeholder="Ask about the stay or local area…" className="min-w-0 flex-1 border border-[#d8cdba] bg-white px-4 py-3 text-sm outline-none focus:border-[#c2683f]"/><button type="submit" disabled={loading || !input.trim()} className="bg-[#c2683f] px-5 py-3 text-[11px] uppercase tracking-[.15em] text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Sending…" : "Send"}</button></div><p className="mt-2 text-xs text-[#8d7c66]" role="status">{state === "temporarily-unavailable" ? "Temporarily unavailable — your question has been preserved." : "Verified guidance only; live details can change."}</p></form>
			</div>
		</div>}
	</>
}
