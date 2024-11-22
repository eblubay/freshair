import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
	title: {
		default: "Freshair - Property Management Platform",
		template: "%s | Freshair"
	},
	description:
		"Import your Airbnb listings to Freshair. Connect directly with guests, avoid fees, and take control of your rental business—all while keeping your data yours.",
	keywords: [
		"property management",
		"vacation rentals",
		"airbnb import",
		"direct bookings",
		"rental management",
		"host platform"
	],
	authors: [
		{
			name: "Freshair"
		}
	],
	creator: "Freshair",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://freshair.vercel.app",
		title: "Freshair - Property Management Platform",
		description:
			"Import your Airbnb listings to Freshair. Connect directly with guests, avoid fees, and take control of your rental business.",
		siteName: "Freshair",
		images: [
			{
				url: "/opengraph.jpg",
				width: 1200,
				height: 630,
				alt: "Freshair - Property Management Platform"
			}
		]
	},
	viewport: {
		width: "device-width",
		initialScale: 1
	},
	robots: {
		index: true,
		follow: true
	},
	twitter: {
		card: "summary_large_image",
		title: "Freshair - Property Management Platform",
		description:
			"Import your Airbnb listings to Freshair. Connect directly with guests, avoid fees, and take control of your rental business.",
		images: ["/opengraph.jpg"]
	}
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<ClerkProvider>
			<html lang="en">
				<head>
					<link rel="icon" type="image/png" href="/favicon.png" />
					<link rel="stylesheet" href="https://use.typekit.net/gnn8txw.css" />
				</head>
				<body>
					{children}
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	)
}
