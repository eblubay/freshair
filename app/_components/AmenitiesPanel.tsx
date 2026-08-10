"use client"

import type { AmenityGroupView } from "@/lib/view-model"
import { useEffect, useState } from "react"

type AmenitiesPanelProps = {
	groups: AmenityGroupView[]
	count: number
	highlights: string[]
}

export function AmenitiesPanel({ groups, count, highlights }: AmenitiesPanelProps) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return

		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false)
		}

		document.addEventListener("keydown", onKey)
		const previous = document.body.style.overflow
		document.body.style.overflow = "hidden"

		return () => {
			document.removeEventListener("keydown", onKey)
			document.body.style.overflow = previous
		}
	}, [open])

	if (groups.length === 0) return null

	return (
		<div>
			<div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
				{highlights.map((item) => (
					<div
						key={item}
						className="flex items-baseline gap-3 border-b border-[#e6ddcf] pb-4 text-[#3d4b57]"
					>
						<span className="text-[#c2683f]">—</span>
						<span className="text-[15px]">{item}</span>
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={() => setOpen(true)}
				className="mt-10 border border-[#c9bda9] px-8 py-3 text-xs uppercase tracking-[0.18em] text-[#3d4b57] transition-colors hover:border-[#3d4b57]"
			>
				View all {count} amenities
			</button>

			{open && (
				<div
					className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-0 sm:p-8"
					role="dialog"
					aria-modal="true"
					onClick={(event) => {
						if (event.target === event.currentTarget) setOpen(false)
					}}
				>
					<div className="flex h-full w-full max-w-3xl flex-col bg-[#fdfbf7] sm:h-auto sm:max-h-[85vh]">
						<div className="flex items-center justify-between border-b border-[#e6ddcf] px-6 py-5">
							<h3 className="font-serif text-2xl text-[#28323b]">
								Everything this home offers
							</h3>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="p-2 text-2xl leading-none text-[#3d4b57]"
								aria-label="Close amenities"
							>
								×
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-6 py-6">
							{groups.map((group) => (
								<section key={group.title} className="mb-10 last:mb-0">
									<h4 className="mb-4 text-xs uppercase tracking-[0.2em] text-[#8d7c66]">
										{group.title}
									</h4>
									<ul className="space-y-3">
										{group.items.map((item) => (
											<li
												key={`${group.title}-${item.title}`}
												className="flex items-start gap-3 border-b border-[#efe8dd] pb-3 last:border-0"
											>
												<span
													className={
														item.available ? "text-[#c2683f]" : "text-[#b9ada0]"
													}
												>
													{item.available ? "—" : "×"}
												</span>
												<span
													className={
														item.available
															? "text-[15px] text-[#3d4b57]"
															: "text-[15px] text-[#a3988b] line-through"
													}
												>
													{item.title}
													{item.subtitle && (
														<span className="mt-0.5 block text-[13px] text-[#8d7c66] no-underline">
															{item.subtitle}
														</span>
													)}
												</span>
											</li>
										))}
									</ul>
								</section>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
