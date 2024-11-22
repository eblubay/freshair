"use client"
import { Button } from "@/components/ui/button"
import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton
} from "@clerk/nextjs"
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
					<Link
						href="/dashboard"
						className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
					>
						Dashboard
					</Link>
					<Link
						href="/explore"
						className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
					>
						Explore
					</Link>
				</div>
				<div className="ml-auto flex items-center gap-4">
					<SignedOut>
						<SignInButton>
							<Button variant="ghost">Sign In</Button>
						</SignInButton>
						<SignUpButton>
							<Button>Sign Up</Button>
						</SignUpButton>
					</SignedOut>
					<SignedIn>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
				</div>
			</div>
		</nav>
	)
}
