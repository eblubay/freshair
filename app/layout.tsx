import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shellbytheshore.com"
const isProductionCanonical = siteUrl === "https://shellbytheshore.com"

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "ShellByTheShore — Manhattan Beach Coastal Retreat",
		template: "%s | ShellByTheShore"
	},
	description:
		"A bright coastal retreat a short walk from the sand in Manhattan Beach, California. Check dates and request availability directly with the owner.",
	keywords: [
		"Manhattan Beach vacation rental",
		"El Porto beach house",
		"direct booking",
		"coastal retreat",
		"ShellByTheShore"
	],
	authors: [
		{
			name: "ShellByTheShore"
		}
	],
	creator: "ShellByTheShore",
	openGraph: {
		type: "website",
		locale: "en_US",
		title: "ShellByTheShore — Manhattan Beach Coastal Retreat",
		description:
			"A bright coastal retreat a short walk from the sand in Manhattan Beach, California.",
		siteName: "ShellByTheShore",
		images: [
			{
				url: "/branding/logo.png",
				width: 1024,
				height: 1536,
				alt: "ShellByTheShore"
			}
		]
	},
	other: {
		"application-name": "ShellByTheShore"
	},
	robots: {
		index: isProductionCanonical,
		follow: isProductionCanonical
	},
	twitter: {
		card: "summary_large_image",
		title: "ShellByTheShore — Manhattan Beach Coastal Retreat",
		description:
			"A bright coastal retreat a short walk from the sand in Manhattan Beach, California.",
		images: ["/branding/logo.png"]
	},
	icons: [
		{
			rel: "icon",
			type: "image/jpeg",
			url: "/favicon.jpg"
		}
	]
}

export const viewport = {
	width: "device-width",
	initialScale: 1
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
					<link rel="stylesheet" href="https://use.typekit.net/gnn8txw.css" />
					<script
						type="application/ld+json"
						dangerouslySetInnerHTML={{
							__html: JSON.stringify({
								"@context": "https://schema.org",
								"@type": "WebSite",
								name: "ShellByTheShore",
								url: "https://shellbytheshore.com",
								description: "A coastal retreat in Manhattan Beach, California."
							}).replace(/</g, "\\u003c")
						}}
					/>
				</head>
				<body>
					{children}
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	)
}
