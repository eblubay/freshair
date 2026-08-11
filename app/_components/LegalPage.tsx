import { SiteFooter } from "@/app/_components/SiteFooter"
import { SiteHeader } from "@/app/_components/SiteHeader"

export const LEGAL_VERSION = "2026-08-11"

const NAV = [
	{ label: "Home", href: "/" },
	{ label: "Local Guide", href: "/guide" }
]

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
	return <div className="min-h-screen bg-[#fdfbf7] text-[#28323b]"><SiteHeader nav={NAV} ctaHref="/#availability"/><main className="mx-auto max-w-4xl px-5 pb-20 pt-36 sm:px-8 sm:pt-44"><p className="text-[11px] uppercase tracking-[.28em] text-[#8d7c66]">Shell By The Shore · Legal</p><h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">{title}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#5d6b78]">{intro}</p><p className="mt-4 text-sm text-[#8d7c66]">Effective date and version: {LEGAL_VERSION}</p><article className="mt-12 space-y-10 text-[15px] leading-7 text-[#4d5b66]">{children}</article></main><SiteFooter location="Manhattan Beach, California"/></div>
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
	return <section><h2 className="font-serif text-3xl text-[#28323b]">{title}</h2><div className="mt-3 space-y-4">{children}</div></section>
}
