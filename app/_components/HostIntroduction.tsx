import type { HostDetails } from "@/data/types"
import Image from "next/image"

interface HostIntroductionProps {
	host: HostDetails
}

export function HostIntroduction({ host }: HostIntroductionProps) {
	return (
		<div className="mt-8 flex items-center gap-4">
			<Image
				src={host.profilePicture}
				alt={`${host.name}'s profile`}
				width={56}
				height={56}
				className="rounded-full"
			/>
			<div>
				<h3 className="text-lg font-medium">Hosted by {host.name}</h3>
				<p className="text-sm text-gray-500">
					{host.stats.yearsHosting} years hosting · {host.stats.reviews} reviews
					· {host.isSuperhost ? "Superhost" : ""}
				</p>
			</div>
		</div>
	)
}
