"use client"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Navbar() {
	return (
		<nav className="border-b sticky top-0 bg-background z-50">
			<div className="container mx-auto flex h-14 items-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
				<div className="flex items-center gap-12">
					<Link
						href="/"
						className="font-display text-2xl font-bold tracking-tight"
					>
						<span className="text-foreground">Fresh</span>
						<span className="text-primary">air</span>
					</Link>
				</div>
				<div className="ml-auto flex items-center gap-4">
					<Button variant="ghost">Sign Up</Button>
					<Button>Sign In</Button>
				</div>
			</div>
		</nav>
	)
}
