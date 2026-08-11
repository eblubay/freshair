import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { Suspense } from "react"
import { Navbar } from "../_components/Navbar"
import { AddPropertyForm } from "./_components/add-property-form"
import { PropertyCardSkeleton } from "./_components/loading-skeleton"
import { PropertiesList } from "./_components/properties-list"

/**
 * Owner dashboard.
 *
 * Signed-out visitors get Clerk's sign-in form inline (hash routing) instead of
 * the middleware 404 that `auth.protect()` produced, because this app ships no
 * dedicated `/sign-in` route.
 */
export default async function Dashboard() {
	const { userId } = await auth()

	if (!userId) {
		return (
			<div className="min-h-screen bg-[#fdfbf7]">
				<Navbar />
				<main className="flex flex-col items-center px-5 py-20">
					<h1 className="mb-3 font-serif text-3xl text-[#28323b]">Owner access</h1>
					<p className="mb-10 text-[15px] text-[#5d6b78]">
						Sign in to manage the property and review guest inquiries.
					</p>
					<SignIn routing="hash" />
				</main>
			</div>
		)
	}

	return (
		<div>
			<Navbar />
			<main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
				{/* Welcome Section */}
				<section className="py-8">
					<h1 className="text-3xl font-bold">Welcome back! 👋</h1>
					<p className="mt-2 text-gray-600">
						Manage your properties and track their performance
					</p>
					<a href="/dashboard/cleaning" className="mt-4 inline-block text-sm font-semibold text-[#28323b] underline underline-offset-4">Open private cleaning operations →</a>
					<a href="/dashboard/bookings" className="ml-5 inline-block text-sm font-semibold text-[#28323b] underline underline-offset-4">Open booking calendar →</a>
				</section>

				{/* Add Property Section */}
				<section className="py-6">
					<AddPropertyForm />
				</section>

				{/* Properties List Section */}
				<section className="py-6">
					<h2 className="text-xl font-semibold mb-4">Your Properties</h2>
					<Suspense
						fallback={
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<PropertyCardSkeleton />
								<PropertyCardSkeleton />
								<PropertyCardSkeleton />
							</div>
						}
					>
						<PropertiesList />
					</Suspense>
				</section>
			</main>
		</div>
	)
}
