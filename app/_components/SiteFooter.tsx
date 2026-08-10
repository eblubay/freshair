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
						<p className="mt-5 text-sm text-[#5d6b78]">{location}</p>
					</div>

					<div className="text-sm text-[#5d6b78]">
						<a
							href="#availability"
							className="block transition-colors hover:text-[#c2683f]"
						>
							Request availability
						</a>
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
