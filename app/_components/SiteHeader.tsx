"use client"

import { useEffect, useState } from "react"
import { BrandLogoLink } from "./BrandLogo"

type NavItem = { label: string; href: string }

type SiteHeaderProps = {
	/** Section anchors are only rendered when the target exists on the page. */
	nav: NavItem[]
	ctaHref: string
}

export function SiteHeader({ nav, ctaHref }: SiteHeaderProps) {
	const [open, setOpen] = useState(false)
	const [scrolled, setScrolled] = useState(false)

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24)
		onScroll()
		window.addEventListener("scroll", onScroll, { passive: true })
		return () => window.removeEventListener("scroll", onScroll)
	}, [])

	useEffect(() => {
		const previous = document.body.style.overflow
		document.body.style.overflow = open ? "hidden" : previous
		return () => {
			document.body.style.overflow = previous
		}
	}, [open])

	return (
		<header
			className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
				scrolled || open
					? "bg-[#fdfbf7]/95 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur"
					: "bg-[#fdfbf7]/80 backdrop-blur-sm"
			}`}
		>
			<div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-14">
				<BrandLogoLink height={64} priority />

				<nav className="hidden items-center gap-9 lg:flex">
					{nav.map((item) => (
						<a
							key={item.href}
							href={item.href}
							className="text-[13px] uppercase tracking-[0.14em] text-[#3d4b57] transition-colors hover:text-[#c2683f]"
						>
							{item.label}
						</a>
					))}
					<a
						href={ctaHref}
						className="border border-[#28323b] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-[#28323b] transition-colors hover:bg-[#28323b] hover:text-[#fdfbf7]"
					>
						Check availability
					</a>
				</nav>

				<button
					type="button"
					onClick={() => setOpen((value) => !value)}
					className="flex h-11 w-11 items-center justify-center lg:hidden"
					aria-label={open ? "Close menu" : "Open menu"}
					aria-expanded={open}
				>
					<span className="relative block h-4 w-6">
						<span
							className={`absolute left-0 block h-px w-6 bg-[#28323b] transition-transform duration-300 ${
								open ? "top-2 rotate-45" : "top-0"
							}`}
						/>
						<span
							className={`absolute left-0 top-2 block h-px w-6 bg-[#28323b] transition-opacity duration-200 ${
								open ? "opacity-0" : "opacity-100"
							}`}
						/>
						<span
							className={`absolute left-0 block h-px w-6 bg-[#28323b] transition-transform duration-300 ${
								open ? "top-2 -rotate-45" : "top-4"
							}`}
						/>
					</span>
				</button>
			</div>

			{open && (
				<div className="border-t border-[#e6ddcf] bg-[#fdfbf7] lg:hidden">
					<nav className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
						{nav.map((item) => (
							<a
								key={item.href}
								href={item.href}
								onClick={() => setOpen(false)}
								className="block border-b border-[#efe8dd] py-4 text-sm uppercase tracking-[0.14em] text-[#3d4b57]"
							>
								{item.label}
							</a>
						))}
						<a
							href={ctaHref}
							onClick={() => setOpen(false)}
							className="mt-6 block bg-[#28323b] px-6 py-4 text-center text-[11px] uppercase tracking-[0.18em] text-[#fdfbf7]"
						>
							Check availability
						</a>
					</nav>
				</div>
			)}
		</header>
	)
}
