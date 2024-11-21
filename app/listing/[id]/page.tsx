import { Separator } from "@/components/ui/separator"
import { getListing } from "@/lib/data"
import { incrementPropertyViews } from "@/lib/properties"
import { AboutSpace } from "../../_components/AboutSpace"
import { Amenities } from "../../_components/Amenities"
import { BookingCard } from "../../_components/BookingCard"
import { Gallery } from "../../_components/Gallery"
import { HostDetails } from "../../_components/HostDetails"
import { HostIntroduction } from "../../_components/HostIntroduction"
import { ListingHeader } from "../../_components/ListingHeader"
import { LocationSection } from "../../_components/Location"
import { MobileBookingBar } from "../../_components/MobileBookingBar"
import { Navbar } from "../../_components/Navbar"
import { Reviews } from "../../_components/Reviews"
import { ThingsToKnow } from "../../_components/ThingsToKnow"

type Params = Promise<{ id: string }>

export default async function ListingPage({ params }: { params: Params }) {
	const listing = await getListing((await params).id)

	// Increment views when the page loads
	await incrementPropertyViews((await params).id)

	if (!listing || !listing.data) {
		return (
			<div className="min-h-screen flex flex-col">
				<Navbar />
				<main className="flex-1 container mx-auto px-4 flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-2xl font-semibold mb-4">Listing Not Found</h1>
						<p className="text-gray-600">
							The listing you're looking for doesn't exist or has been removed.
						</p>
					</div>
				</main>
			</div>
		)
	}

	const pricePerNight = 150

	// Flatten all images from all rooms into a single array
	const allImages = listing.data.gallery.rooms.flatMap((room) => room.images)

	return (
		<div>
			<Navbar />
			<main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 2xl:px-40 pb-20 md:pb-40">
				<h1 className="text-3xl font-semibold pt-8">{listing.data.h1Title}</h1>
				<Gallery
					images={allImages}
					className="mt-8 max-h-[600px] overflow-hidden"
				/>
				<div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
					<div className="col-span-1 lg:col-span-2">
						<ListingHeader overview={listing.data.overview} />
						<HostIntroduction host={listing.data.host.host} />
						<Separator className="my-8" />
						<AboutSpace description={listing.data.description} />
						<Separator className="my-8" />
						<Amenities amenities={listing.data.amenities} />
						<Separator className="my-8" />
						<Reviews
							reviews={listing.data.reviews}
							rating={listing.data.overview.rating}
						/>
						<Separator className="my-8" />
						<LocationSection location={listing.data.location} />
						<Separator className="my-8" />
						<HostDetails host={listing.data.host} />
						<Separator className="my-8" />
						<ThingsToKnow policies={listing.data.policies} />
					</div>
					<div className="hidden lg:block">
						<BookingCard
							pricePerNight={pricePerNight}
							capacity={listing.data.overview.capacity}
							propertyId={(await params).id}
						/>
					</div>
				</div>
			</main>
			<MobileBookingBar
				pricePerNight={pricePerNight}
				capacity={listing.data.overview.capacity}
				propertyId={(await params).id}
				className="lg:hidden"
			/>
		</div>
	)
}
