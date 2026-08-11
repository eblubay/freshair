import { GuestPortal } from "@/app/guest/GuestPortal"
import { SiteFooter } from "@/app/_components/SiteFooter"
import { SiteHeader } from "@/app/_components/SiteHeader"
import { Suspense } from "react"

export const metadata = { title: "Guest portal | ShellByTheShore", robots: { index: false, follow: false } }

const NAV = [{ label: "Home", href: "/" }, { label: "Local Guide", href: "/guide" }, { label: "House Guide", href: "/house-guide" }]

export default function GuestPage() {
	return <div className="min-h-screen bg-[#fdfbf7] text-[#28323b]"><SiteHeader nav={NAV} ctaHref="/"/><main className="mx-auto max-w-3xl px-5 pb-20 pt-36 sm:px-8 sm:pt-44"><p className="text-[11px] uppercase tracking-[.28em] text-[#8d7c66]">ShellByTheShore</p><h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">Guest portal</h1><p className="mt-5 max-w-2xl leading-relaxed text-[#5d6b78]">Open your private arrival information with the secure access link sent for your reservation.</p><Suspense fallback={<p className="mt-10 text-sm text-[#5d6b78]">Opening secure portal…</p>}><GuestPortal/></Suspense></main><SiteFooter location="Manhattan Beach, California"/></div>
}
