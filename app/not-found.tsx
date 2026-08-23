import Link from "next/link"

export default function NotFound() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-[#fdfbf7] px-5 text-[#28323b]">
			<div className="max-w-lg text-center">
				<p className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c66]">404</p>
				<h1 className="mt-4 font-serif text-4xl">This page could not be found</h1>
				<p className="mt-5 leading-7 text-[#5d6b78]">Return to ShellByTheShore to explore the stay, Local Guide, and availability inquiry.</p>
				<Link href="/" className="mt-8 inline-block border border-[#c9bda9] px-8 py-3 text-[11px] uppercase tracking-[0.18em] hover:border-[#3d4b57]">Return home</Link>
			</div>
		</main>
	)
}
