import Link from "next/link"
import { BrandLogo } from "./BrandLogo"

type SiteFooterProps = {
	location: string
}

export function SiteFooter({ location }: SiteFooterProps) {
	return (
		<footer className="border-t border-[#e6ddcf] bg-[#fdfbf7] py-14">
			<div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-14">
				<div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-end md:justify-between md:text-left">
					<div>
						<Link href="/" aria-label="ShellByTheShore" className="inline-flex">
							<BrandLogo height={64} />
						</Link>
						<p className="mt-5 text-sm text-[#5d6b78]">Shell By The Shore<br/>Manhattan Beach, California</p>
					</div>

					<div className="text-sm text-[#5d6b78]">
						<a
							href="#availability"
							className="block transition-colors hover:text-[#c2683f]"
						>
							Request availability
						</a>
						<nav aria-label="Legal and contact" className="mt-4 grid gap-2">
							<Link href="/privacy-policy" className="transition-colors hover:text-[#c2683f]">Privacy Policy</Link>
							<Link href="/terms-and-conditions" className="transition-colors hover:text-[#c2683f]">Terms &amp; Conditions</Link>
							<Link href="/accessibility" className="transition-colors hover:text-[#c2683f]">Accessibility</Link>
							<Link href="/privacy-choices" className="transition-colors hover:text-[#c2683f]">Privacy Choices / Do Not Sell or Share</Link>
							<Link href="/privacy-choices" className="transition-colors hover:text-[#c2683f]">Contact — REQUIRED BEFORE LIVE</Link>
						</nav>
						<Link
							href="/dashboard"
							className="mt-3 block text-[13px] text-[#a3988b] transition-colors hover:text-[#5d6b78]"
						>
							Owner access
						</Link>
						<p className="mt-5 text-[13px] text-[#a3988b]">
							© {new Date().getFullYear()} ShellByTheShore
						</p>
					</div>
				</div>
			</div>
		</footer>
	)
}
