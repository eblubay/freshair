import { Navbar } from "@/app/_components/Navbar"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Home, Lock } from "lucide-react"
import Image from "next/image"

export default function MarketingPage() {
	return (
		<div>
			<Navbar />

			<main>
				{/* Hero Section */}
				<section className="container mx-auto px-4 py-24 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<div>
							<h1 className="text-5xl font-bold tracking-tight">
								Own Your Rental Presence
							</h1>
							<p className="mt-6 text-xl text-gray-600">
								Export your Airbnb listing to your own domain. Maintain control
								of your data and build direct relationships with your guests.
							</p>
							<div className="mt-8 flex gap-4">
								<Button size="lg">Get Started</Button>
								<Button size="lg" variant="outline">
									View Demo
								</Button>
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

				{/* Features Section */}
				<section className="bg-gray-50">
					<div className="container mx-auto px-4 py-24 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
						<h2 className="text-3xl font-bold text-center">
							Everything You Need to Run Your Rental
						</h2>
						<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
							<Card>
								<CardContent className="pt-6">
									<div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
										<Home className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold">
										Your Domain, Your Rules
									</h3>
									<p className="mt-2 text-gray-600">
										Host your listing on your own domain and customize every
										aspect of the experience.
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-6">
									<div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
										<Lock className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold">
										Data Sovereignty
									</h3>
									<p className="mt-2 text-gray-600">
										Own your listing data and guest relationships without
										depending on third-party platforms.
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-6">
									<div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
										<CreditCard className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold">
										Custom Payments
									</h3>
									<p className="mt-2 text-gray-600">
										Set up your own payment processing and keep more of your
										rental income.
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
							Join thousands of hosts who have already claimed their
							independence.
						</p>
						<Button size="lg" variant="secondary" className="mt-8">
							Get Started Now
						</Button>
					</div>
				</section>
			</main>
		</div>
	)
}
