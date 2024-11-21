import { Navbar } from "@/app/_components/Navbar"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import { Code2, Github, MessageSquare, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default async function MarketingPage() {
	const { userId } = await auth()

	return (
		<div>
			<Navbar />

			<main>
				{/* Hero Section */}
				<section className="container mx-auto px-4 py-24 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<div>
							<div className="flex items-center gap-2 mb-6">
								<span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
									Open Source
								</span>
								<span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
									Self-Hostable
								</span>
							</div>
							<h1 className="text-5xl font-bold tracking-tight">
								Your Listings.
								<br />
								<span className="text-primary">Your Relationships.</span>
							</h1>
							<p className="mt-6 text-xl text-gray-600">
								Import your Airbnb listings to Freshair. Connect directly with
								guests, avoid fees, and take control of your rental business—all
								while keeping your data yours.
							</p>
							<div className="mt-8 flex gap-4">
								<Link href="/dashboard">
									<Button size="lg">
										{userId ? "View Dashboard" : "Get Started Free"}
									</Button>
								</Link>
								<Link
									href="https://github.com/bjornpagen/freshair"
									target="_blank"
								>
									<Button size="lg" variant="outline">
										<Github className="mr-2 h-5 w-5" />
										Star on GitHub
									</Button>
								</Link>
							</div>
						</div>
						<div className="rounded-xl border bg-background shadow-lg">
							<div className="flex items-center border-b px-4 py-2">
								<div className="flex gap-2">
									<div className="h-3 w-3 rounded-full bg-red-500" />
									<div className="h-3 w-3 rounded-full bg-yellow-500" />
									<div className="h-3 w-3 rounded-full bg-green-500" />
								</div>
							</div>
							<AspectRatio ratio={16 / 9} className="overflow-hidden">
								<Image
									src="/screenshot.png"
									alt="Example listing page"
									fill
									className="object-cover scale-[1.15] origin-center"
									priority
								/>
							</AspectRatio>
						</div>
					</div>
				</section>

				{/* Stats Section */}
				<section className="border-y bg-muted/30">
					<div className="container mx-auto px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
							<div>
								<div className="text-4xl font-bold text-primary">100%</div>
								<div className="mt-2 text-sm text-gray-600">
									Fee-Free Bookings
								</div>
							</div>
							<div>
								<div className="text-4xl font-bold text-primary">1-Click</div>
								<div className="mt-2 text-sm text-gray-600">Airbnb Import</div>
							</div>
							<div>
								<div className="text-4xl font-bold text-primary">∞</div>
								<div className="mt-2 text-sm text-gray-600">
									Self-Hosting Options
								</div>
							</div>
							<div>
								<div className="text-4xl font-bold text-primary">0BSD</div>
								<div className="mt-2 text-sm text-gray-600">Licensed</div>
							</div>
						</div>
					</div>
				</section>

				{/* Features Section */}
				<section className="bg-background">
					<div className="container mx-auto px-4 py-24 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
						<h2 className="text-3xl font-bold text-center">
							Built for Independent Hosts
						</h2>
						<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
							<Card>
								<CardContent className="pt-6">
									<div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
										<MessageSquare className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold">
										Direct Guest Communication
									</h3>
									<p className="mt-2 text-gray-600">
										Connect with guests directly through your preferred
										channels. Build lasting relationships without platform
										restrictions.
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-6">
									<div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
										<Code2 className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold">
										Self-Host & Customize
									</h3>
									<p className="mt-2 text-gray-600">
										Deploy Freshair on your own infrastructure. Modify the code
										to match your exact needs. Your platform, your way.
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-6">
									<div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
										<Users className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold">
										Community-Driven
									</h3>
									<p className="mt-2 text-gray-600">
										Join a community of independent hosts. Share experiences,
										contribute code, and help shape the future of Freshair.
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="container mx-auto px-4 py-24 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
					<div className="bg-primary rounded-2xl text-primary-foreground p-12 text-center">
						<h2 className="text-3xl font-bold">Ready to Take Control?</h2>
						<p className="mt-4 text-xl opacity-90">
							Join the community of hosts who've embraced true independence.
						</p>
						<div className="mt-8 flex justify-center gap-4">
							<Link href="/dashboard">
								<Button size="lg" variant="secondary">
									{userId ? "View Dashboard" : "Get Started Free"}
								</Button>
							</Link>
							<Link href="/explore">
								<Button
									size="lg"
									variant="outline"
									className="bg-primary/10 hover:bg-primary/20"
								>
									Explore Listings
								</Button>
							</Link>
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}
