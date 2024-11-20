"use client"
import { Button } from "@/components/ui/button"

export function Navbar() {
	return (
		<nav className="border-b sticky top-0 bg-background z-50">
			<div className="container mx-auto flex h-20 items-center px-40">
				<div className="flex items-center gap-12">
					<h2 className="font-display text-2xl font-bold tracking-tight">
						<span className="text-foreground">Fresh</span>
						<span className="text-primary">air</span>
					</h2>
				</div>
				<div className="ml-auto flex items-center gap-4">
					<Button variant="ghost">Sign Up</Button>
					<Button>Sign In</Button>
				</div>
			</div>
		</nav>
	)
}
