import DatePickerWithRange from "@/components/date-picker-with-range"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { getListing } from "@/lib/data"
import { Check, MessageSquare, Shield, Star as StarIcon, X } from "lucide-react"
import Image from "next/image"
import { Gallery } from "./_components/Gallery"
import { MapSection } from "./_components/MapSection"
import { Navbar } from "./_components/Navbar"

export default function Home() {
	const listing = getListing()
	const pricePerNight = 150

	// Flatten all images from all rooms into a single array
	const allImages = listing.data.gallery.rooms.flatMap((room) => room.images)

	const title = listing.data.overview.title
	const [mainTitle, ...details] = title.split(" · ")

	// Get the first section and the rest
	const [firstSection, ...remainingSections] = listing.data.description.sections

	return (
		<div>
			<Navbar />
			<main className="container mx-auto px-40 pb-40">
				<h1 className="text-3xl font-semibold pt-8">{mainTitle}</h1>
				<Gallery
					images={allImages}
					className="mt-8 max-h-[600px] overflow-hidden"
				/>
				<div className="mt-6 grid grid-cols-3 gap-8">
					<div className="col-span-2">
						<h2 className="text-2xl font-medium">
							{listing.data.overview.propertyType} in{" "}
							{listing.data.overview.location}
						</h2>
						<h3 className="mt-1 text-base text-gray-500">
							{details.join(" · ")} · {listing.data.overview.capacity} guests
						</h3>
						<div className="mt-8 flex items-center gap-4">
							<Image
								src={listing.data.host.host.profilePicture}
								alt={`${listing.data.host.host.name}'s profile`}
								width={56}
								height={56}
								className="rounded-full"
							/>
							<div>
								<h3 className="text-lg font-medium">
									Hosted by {listing.data.host.host.name}
								</h3>
								<p className="text-sm text-gray-500">
									{listing.data.host.host.stats.yearsHosting} years hosting ·{" "}
									{listing.data.host.host.stats.reviews} reviews ·{" "}
									{listing.data.host.host.isSuperhost ? "Superhost" : ""}
								</p>
							</div>
						</div>
						<Separator className="my-8" />
						<h2 className="text-2xl font-medium">About this space</h2>
						<div className="mt-4 space-y-4">
							{/* First section */}
							<div key={`section-${firstSection.content.substring(0, 20)}`}>
								{firstSection.title && (
									<h3 className="font-medium mb-2">{firstSection.title}</h3>
								)}
								<p
									className="whitespace-pre-wrap"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: content is pre-sanitized
									dangerouslySetInnerHTML={{ __html: firstSection.content }}
								/>
							</div>

							{/* Show more button and dialog */}
							<Dialog>
								<DialogTrigger asChild>
									<Button variant="outline">Show more</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-[768px] max-h-[80vh] overflow-y-auto">
									<DialogHeader>
										<DialogTitle>About this space</DialogTitle>
									</DialogHeader>
									<div className="space-y-4">
										{remainingSections.map((section) => (
											<div
												key={`section-${section.title ?? section.content.substring(0, 20)}`}
											>
												{section.title && (
													<h3 className="font-medium mb-2">{section.title}</h3>
												)}
												<p
													className="whitespace-pre-wrap"
													// biome-ignore lint/security/noDangerouslySetInnerHtml: content is pre-sanitized
													dangerouslySetInnerHTML={{ __html: section.content }}
												/>
											</div>
										))}
									</div>
								</DialogContent>
							</Dialog>
						</div>
						<Separator className="my-8" />
						<h2 className="text-2xl font-medium">What this place offers</h2>
						<div className="mt-6 grid grid-cols-2 gap-4">
							{listing.data.amenities.groups.slice(0, 6).map((group) => (
								<div
									key={group.title}
									className="flex items-center gap-2 text-gray-600"
								>
									<Check className="h-5 w-5" />
									{group.amenities[0].title}
								</div>
							))}
						</div>
						<Dialog>
							<DialogTrigger asChild>
								<Button variant="outline" className="mt-4">
									Show all {listing.data.amenities.count} amenities
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[768px] max-h-[80vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>What this place offers</DialogTitle>
								</DialogHeader>
								<div className="grid grid-cols-2 gap-8">
									{listing.data.amenities.groups.map((group) => (
										<div key={group.title}>
											<h3 className="font-medium mb-2">{group.title}</h3>
											<ul className="space-y-2">
												{group.amenities.map((amenity) => (
													<li
														key={amenity.title}
														className="flex items-center gap-2 text-gray-600"
													>
														{amenity.available ? (
															<Check className="h-4 w-4" />
														) : (
															<X className="h-4 w-4" />
														)}
														<span>
															{amenity.title}
															{amenity.subtitle && (
																<span className="text-sm text-gray-500">
																	· {amenity.subtitle}
																</span>
															)}
														</span>
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							</DialogContent>
						</Dialog>
						<Separator className="my-8" />
						<h2 className="text-2xl font-medium">Reviews</h2>
						<div className="mt-4">
							<div className="flex items-center gap-2">
								<StarIcon className="h-5 w-5 fill-current" />
								<span className="font-medium">
									{listing.data.overview.rating}
								</span>
								<span className="text-gray-500">·</span>
								<span className="text-gray-500">
									{listing.data.reviews.length} reviews
								</span>
							</div>

							<div className="mt-6 grid grid-cols-2 gap-6">
								{listing.data.reviews.slice(0, 6).map((review) => (
									<div key={review.id} className="space-y-4">
										<div className="flex gap-4">
											<div className="h-10 w-10 overflow-hidden rounded-full">
												<Image
													src={review.reviewer.photo}
													alt={review.reviewer.name}
													width={40}
													height={40}
													className="h-full w-full object-cover"
												/>
											</div>
											<div>
												<h3 className="font-medium">{review.reviewer.name}</h3>
												<div className="flex items-center gap-1 text-sm text-gray-500">
													<div className="flex">
														{[...Array(5)].map((_, i) => (
															<StarIcon
																key={`${review.id}-star-${i}`}
																className={`h-3 w-3 ${
																	i < review.rating
																		? "fill-current text-primary"
																		: "text-gray-200"
																}`}
															/>
														))}
													</div>
													<span>·</span>
													<span>{review.date}</span>
												</div>
											</div>
										</div>
										<p className="text-gray-600 line-clamp-3">
											{review.comment}
										</p>
									</div>
								))}
							</div>

							<Dialog>
								<DialogTrigger asChild>
									<Button variant="outline" className="mt-6">
										Show all {listing.data.reviews.length} reviews
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-[768px] max-h-[80vh] overflow-y-auto">
									<DialogHeader>
										<DialogTitle>
											<div className="flex items-center gap-2">
												<StarIcon className="h-5 w-5 fill-current" />
												<span>{listing.data.overview.rating}</span>
												<span className="text-gray-500">·</span>
												<span className="text-gray-500">
													{listing.data.reviews.length} reviews
												</span>
											</div>
										</DialogTitle>
									</DialogHeader>
									<div className="grid grid-cols-1 gap-8">
										{listing.data.reviews.map((review) => (
											<div key={review.id} className="space-y-4">
												<div className="flex gap-4">
													<div className="h-10 w-10 overflow-hidden rounded-full">
														<Image
															src={review.reviewer.photo}
															alt={review.reviewer.name}
															width={40}
															height={40}
															className="h-full w-full object-cover"
														/>
													</div>
													<div>
														<h3 className="font-medium">
															{review.reviewer.name}
														</h3>
														<div className="flex items-center gap-1 text-sm text-gray-500">
															<div className="flex">
																{[...Array(5)].map((_, i) => (
																	<StarIcon
																		key={`${review.id}-star-${i}`}
																		className={`h-3 w-3 ${
																			i < review.rating
																				? "fill-current text-primary"
																				: "text-gray-200"
																		}`}
																	/>
																))}
															</div>
															<span>·</span>
															<span>{review.date}</span>
														</div>
													</div>
												</div>
												<p
													className="text-gray-600 whitespace-pre-wrap"
													// biome-ignore lint/security/noDangerouslySetInnerHtml: content is pre-sanitized
													dangerouslySetInnerHTML={{ __html: review.comment }}
												/>
											</div>
										))}
									</div>
								</DialogContent>
							</Dialog>
						</div>
						<Separator className="my-8" />
						<h2 className="text-2xl font-medium">Where you'll be</h2>
						<div className="mt-4">
							<h3 className="font-medium">{listing.data.location.subtitle}</h3>

							<MapSection
								coordinates={{
									latitude: listing.data.location.coordinates.lat,
									longitude: listing.data.location.coordinates.lng
								}}
								radiusInMeters={
									listing.data.location.mapMarkerRadiusInMeters ?? 500
								}
							/>

							{listing.data.location.locationDetails.full.map((detail) => (
								<div key={detail.id} className="mt-4">
									{detail.title && (
										<h3 className="font-medium mb-2">{detail.title}</h3>
									)}
									{detail.content && (
										<p className="text-gray-600">{detail.content}</p>
									)}
								</div>
							))}

							{listing.data.location.verification?.isVerified && (
								<div className="mt-4 flex items-center gap-2 text-gray-600">
									<Check className="h-5 w-5" />
									<span>{listing.data.location.verification.helpText}</span>
								</div>
							)}

							{listing.data.location.disclaimer && (
								<p className="mt-4 text-sm text-gray-500">
									{listing.data.location.disclaimer}
								</p>
							)}
						</div>
						<Separator className="my-8" />
						<h2 className="text-2xl font-medium">Meet your hosts</h2>
						<div className="mt-6 space-y-6">
							{/* Host info and stats */}
							<div className="flex items-start gap-6">
								<Image
									src={listing.data.host.host.profilePicture}
									alt={listing.data.host.host.name}
									width={150}
									height={150}
									className="rounded-full"
								/>
								<div className="space-y-4">
									<div>
										<h3 className="text-xl font-medium">
											{listing.data.host.host.name}
										</h3>
										<p className="text-gray-500">
											Joined {listing.data.host.host.stats.yearsHosting} years
											ago
										</p>
									</div>

									<div className="flex gap-4">
										<div className="flex items-center gap-2">
											<StarIcon className="h-5 w-5" />
											<span>{listing.data.host.host.stats.rating} Rating</span>
										</div>
										<div className="flex items-center gap-2">
											<MessageSquare className="h-5 w-5" />
											<span>
												{listing.data.host.host.stats.reviews} Reviews
											</span>
										</div>
										{listing.data.host.host.isVerified && (
											<div className="flex items-center gap-2">
												<Shield className="h-5 w-5" />
												<span>Identity verified</span>
											</div>
										)}
									</div>

									{/* Host highlights */}
									{listing.data.host.highlights.length > 0 && (
										<div className="space-y-2">
											{listing.data.host.highlights.map((highlight) => (
												<div
													key={highlight.title}
													className="flex items-center gap-2"
												>
													<Check className="h-5 w-5" />
													<span>{highlight.title}</span>
												</div>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Host about section */}
							{listing.data.host.about && (
								<div className="mt-6">
									<p className="text-gray-600 whitespace-pre-wrap">
										{listing.data.host.about}
									</p>
								</div>
							)}

							{/* Co-hosts */}
							{listing.data.host.cohosts.length > 0 && (
								<div className="mt-6">
									<h3 className="text-lg font-medium mb-4">Co-hosts</h3>
									<div className="flex gap-4">
										{listing.data.host.cohosts.map((cohost) => (
											<div
												key={cohost.userId}
												className="flex items-center gap-2"
											>
												<div className="h-10 w-10 overflow-hidden rounded-full">
													<Image
														src={cohost.profilePicture}
														alt={cohost.name}
														width={40}
														height={40}
														className="h-full w-full object-cover"
													/>
												</div>
												<span>{cohost.name}</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
						<Separator className="my-8" />
						<h2 className="text-2xl font-medium">Things to know</h2>
						<div className="mt-4 grid grid-cols-3 gap-8">
							{/* House Rules */}
							<div>
								<h3 className="font-medium mb-4">House rules</h3>
								<ul className="space-y-4">
									{listing.data.policies.houseRules.sections.flatMap(
										(section) =>
											section.rules.map((rule) => (
												<li
													key={rule.title}
													className="flex items-start gap-2 text-gray-600"
												>
													{rule.icon && (
														<span className="mt-1">
															<Check className="h-4 w-4" />
														</span>
													)}
													<span>{rule.title}</span>
												</li>
											))
									)}
								</ul>
							</div>

							{/* Safety */}
							<div>
								<h3 className="font-medium mb-4">Safety & property</h3>
								<ul className="space-y-4">
									{listing.data.policies.safety.items.map((item) => (
										<li
											key={item.title}
											className="flex items-start gap-2 text-gray-600"
										>
											<span className="mt-1">
												<Check className="h-4 w-4" />
											</span>
											<span>{item.title}</span>
										</li>
									))}
								</ul>
							</div>

							{/* Cancellation */}
							<div>
								<h3 className="font-medium mb-4">Cancellation policy</h3>
								<p className="text-gray-600">
									{listing.data.policies.cancellation.policy}
								</p>
							</div>
						</div>
					</div>
					<div className="col-span-1">
						<Card className="sticky top-24">
							<CardContent className="p-6">
								<div className="flex items-baseline gap-1">
									<span className="text-2xl font-bold">${pricePerNight}</span>
									<span className="text-gray-500">night</span>
								</div>
								<div className="mt-4 space-y-4">
									<DatePickerWithRange />
									<Select defaultValue="1">
										<SelectTrigger>
											<SelectValue placeholder="Number of guests" />
										</SelectTrigger>
										<SelectContent>
											{[...Array(listing.data.overview.capacity)].map(
												(_, i) => {
													const guestCount = i + 1
													return (
														<SelectItem
															key={guestCount}
															value={guestCount.toString()}
														>
															{guestCount}{" "}
															{guestCount === 1 ? "guest" : "guests"}
														</SelectItem>
													)
												}
											)}
										</SelectContent>
									</Select>
								</div>
								<button
									type="button"
									className="w-full bg-primary text-primary-foreground rounded-lg py-3 mt-4 font-medium"
								>
									Reserve
								</button>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	)
}
