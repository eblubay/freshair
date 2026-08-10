"use client"

import { useState } from "react"

const PROMPTS = ["What should we do in Manhattan Beach today?", "Plan a day in Santa Monica and Venice", "How should we get here from LAX?", "Plan a Malibu day trip", "Where should we eat nearby?", "What can we do with kids?", "What beaches should we visit?"]
type Message = { role: "user" | "assistant"; text: string }

export function Concierge() {
	const [open, setOpen] = useState(false)
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState("")
	const [loading, setLoading] = useState(false)
	async function ask(question: string) {
		if (!question.trim() || loading) return
		setMessages((items) => [...items, { role: "user", text: question }])
		setInput("")
		setLoading(true)
		try {
			const response = await fetch("/api/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) })
			const result = await response.json() as { answer?: string }
			setMessages((items) => [...items, { role: "assistant", text: result.answer ?? "I’m unable to answer that just now." }])
		} catch { setMessages((items) => [...items, { role: "assistant", text: "I’m having trouble connecting right now. The Local Guide is still here to help you plan." }]) } finally { setLoading(false) }
	}
	return <><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center bg-[#c2683f] px-6 py-4 text-[11px] uppercase tracking-[.16em] text-white shadow-[0_10px_24px_rgba(194,104,63,.22)] transition-colors hover:bg-[#a9502c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c2683f] sm:px-7">✨ Ask ShellByTheShore AI</button>{open && <div className="fixed inset-0 z-[110] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="ShellByTheShore Local AI Concierge"><div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden bg-[#fdfbf7] shadow-2xl sm:max-h-[85vh]"><div className="flex items-start justify-between border-b border-[#e6ddcf] p-5 sm:p-7"><div><p className="text-[11px] uppercase tracking-[.22em] text-[#c2683f]">Your Local AI Concierge</p><h2 className="mt-2 font-serif text-3xl sm:text-4xl">Ask ShellByTheShore</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close concierge" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-2xl transition-colors hover:bg-[#f1e4d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2683f]">×</button></div><div className="min-h-[250px] flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">{messages.length === 0 && <><p className="text-[15px] leading-relaxed text-[#5d6b78]">Thoughtful local help for shaping your South Bay stay. For live hours, availability, or traffic, always check directly before heading out.</p><div className="flex flex-wrap gap-2">{PROMPTS.map((prompt) => <button type="button" key={prompt} onClick={() => void ask(prompt)} className="min-h-10 border border-[#d8cdba] bg-white px-3 py-2 text-left text-sm leading-snug text-[#3d4b57] transition-colors hover:border-[#c2683f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2683f]">{prompt}</button>)}</div></>}{messages.map((message, index) => <p key={`${message.role}-${index}`} className={`max-w-[92%] px-4 py-3 text-[15px] leading-relaxed ${message.role === "user" ? "ml-auto bg-[#28323b] text-white" : "bg-[#f1e4d8] text-[#28323b]"}`}>{message.text}</p>)}{loading && <p className="text-sm text-[#8d7c66]">Thinking about your day by the shore…</p>}</div><form onSubmit={(event) => { event.preventDefault(); void ask(input) }} className="flex gap-2 border-t border-[#e6ddcf] bg-white p-4 sm:p-5"><input aria-label="Ask the local concierge" value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 border border-[#d8cdba] bg-[#fdfbf7] px-3 py-3 text-sm outline-none transition-colors focus:border-[#c2683f]" placeholder="Ask about your stay"/><button disabled={loading} className="min-h-11 bg-[#28323b] px-4 py-3 text-[11px] uppercase tracking-[.16em] text-white transition-colors hover:bg-[#3d4b57] disabled:opacity-60 sm:px-5">Send</button></form></div></div>}</>
}
