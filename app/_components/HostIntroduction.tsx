import type { HostDetails } from "@/data/types"
import Image from "next/image"

interface HostIntroductionProps {
	host: HostDetails | null
}

export function HostIntroduction({ host }: HostIntroductionProps) {
	// If no host data, show generic host section
	if (!host || !host.name) {
		return (
			<div className="mt-8 flex items-center gap-4">
				<div className="h-[56px] w-[56px] overflow-hidden rounded-full bg-stone-200 flex items-center justify-center">
					<svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
				</div>
				<div>
					<h3 className="text-lg font-medium">Your Host</h3>
					<p className="text-sm text-gray-500">
						Professional property management
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="mt-8 flex items-center gap-4">
			{host.profilePicture ? (
				<div className="h-[56px] w-[56px] overflow-hidden rounded-full">
					<Image
						src={host.profilePicture}
						alt={`${host.name}'s profile`}
						width={56}
						height={56}
						className="h-full w-full object-cover"
					/>
				</div>
			) : (
				<div className="h-[56px] w-[56px] overflow-hidden rounded-full bg-stone-200 flex items-center justify-center">
					<svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
				</div>
			)}
			<div>
				<h3 className="text-lg font-medium">Hosted by {host.name}</h3>
				{host.stats && (
					<p className="text-sm text-gray-500">
						{host.stats.yearsHosting > 0 && `${host.stats.yearsHosting} years hosting`}
						{host.stats.reviews > 0 && ` · ${host.stats.reviews} reviews`}
						{host.isSuperhost && " · Superhost"}
					</p>
				)}
			</div>
		</div>
	)
}
