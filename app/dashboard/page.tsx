import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ExternalLink, Home, Trash2 } from "lucide-react"
import { Navbar } from "../_components/Navbar"

// Mock data - replace with real data later
const mockProperties = [
	{
		id: "1",
		title: "Cozy Mountain Cabin",
		location: "Boulder, Colorado",
		url: "cabin-in-boulder",
		views: 245,
		bookings: 12
	},
	{
		id: "2",
		title: "Beachfront Villa",
		location: "Miami, Florida",
		url: "miami-beach-villa",
		views: 189,
		bookings: 8
	}
]

export default function DashboardPage() {
	return (
		<div>
			<Navbar />
			<main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40">
				{/* Welcome Section */}
				<section className="py-8">
					<h1 className="text-3xl font-bold">Hello, John! 👋</h1>
					<p className="mt-2 text-gray-600">
						Manage your properties and track their performance
					</p>
				</section>

				{/* Add Property Section */}
				<section className="py-6">
					<Card>
						<CardContent className="p-6">
							<h2 className="text-xl font-semibold mb-4">Add New Property</h2>
							<div className="flex gap-4">
								<Input
									placeholder="Enter your Airbnb listing URL"
									className="flex-1"
								/>
								<Button>
									<Home className="mr-2 h-4 w-4" />
									Add Property
								</Button>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* Properties List Section */}
				<section className="py-6">
					<h2 className="text-xl font-semibold mb-4">Your Properties</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{mockProperties.map((property) => (
							<Card key={property.id}>
								<CardContent className="p-6">
									<div className="flex justify-between items-start">
										<div>
											<h3 className="font-semibold">{property.title}</h3>
											<p className="text-sm text-gray-500">
												{property.location}
											</p>
										</div>
										<div className="flex gap-2">
											<Button variant="ghost" size="icon">
												<ExternalLink className="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="icon">
												<Trash2 className="h-4 w-4 text-red-500" />
											</Button>
										</div>
									</div>

									<div className="mt-4 grid grid-cols-2 gap-4">
										<div>
											<p className="text-sm text-gray-500">Views (30 days)</p>
											<p className="text-lg font-semibold">{property.views}</p>
										</div>
										<div>
											<p className="text-sm text-gray-500">Bookings</p>
											<p className="text-lg font-semibold">
												{property.bookings}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</section>
			</main>
		</div>
	)
}
