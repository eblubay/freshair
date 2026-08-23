import { ownerAccess } from "@/lib/owner-auth"
import { clerkMiddleware } from "@clerk/nextjs/server"
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server"

const applySecurityHeaders = (response: NextResponse) => {
	response.headers.set("X-Content-Type-Options", "nosniff")
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
	response.headers.set("X-Frame-Options", "DENY")
	return response
}

/** Clerk and private no-store behavior are deliberately limited to private/API routes. */
const privateMiddleware = clerkMiddleware(async (auth, request) => {
	const response = NextResponse.next()
	const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
	const hostname = (forwardedHost || request.headers.get("host") || request.nextUrl.hostname).split(":")[0].toLowerCase()
	const ownerPath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname === "/api/health" || request.nextUrl.pathname.startsWith("/api/chatwoot/conversation/") || request.nextUrl.pathname.startsWith("/api/internal/calendar") || request.nextUrl.pathname.startsWith("/api/internal/cancellations") || request.nextUrl.pathname.startsWith("/api/internal/guest-access/") || request.nextUrl.pathname.startsWith("/api/internal/ota-price-observations") || request.nextUrl.pathname.startsWith("/api/internal/payments/") || request.nextUrl.pathname.startsWith("/api/internal/property-private-defaults") || request.nextUrl.pathname.startsWith("/api/internal/settings") || request.nextUrl.pathname.startsWith("/api/internal/telegram/") || request.nextUrl.pathname === "/api/internal/airbnb-calendar/status"
	const stagingHost = hostname.endsWith(".hostingersite.com")

	if (ownerPath) {
		const { userId } = await auth()
		const access = ownerAccess(userId)
		if (access.status === 403)
			return NextResponse.json({ error: "Owner access is required." }, { status: 403, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } })
	}

	if (request.method === "GET" || request.method === "HEAD") {
		response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate")
	}
	if (stagingHost || request.nextUrl.pathname.startsWith("/guest") || request.nextUrl.pathname.startsWith("/api")) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")

	return applySecurityHeaders(response)
})

export default function middleware(request: NextRequest, event: NextFetchEvent) {
	const privatePath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/guest") || request.nextUrl.pathname.startsWith("/api") || request.nextUrl.pathname.startsWith("/trpc")
	if (privatePath) return privateMiddleware(request, event)

	const response = NextResponse.next()
	response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60")
	const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
	const hostname = (forwardedHost || request.headers.get("host") || request.nextUrl.hostname).split(":")[0].toLowerCase()
	if (hostname.endsWith(".hostingersite.com")) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
	return applySecurityHeaders(response)
}

export const config = {
	matcher: [
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		"/(api|trpc)(.*)"
	]
}
