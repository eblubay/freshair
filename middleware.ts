import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

/**
 * Clerk stays active on every route, but `/dashboard` is no longer hard-blocked
 * here: `auth.protect()` produced a 404 because this app ships no `/sign-in`
 * route. The dashboard page itself now renders Clerk's sign-in form for signed
 * out visitors, so the owner always gets a usable screen.
 */
export default clerkMiddleware(async (auth, request) => {
	const response = NextResponse.next()
	const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
	const hostname = (forwardedHost || request.headers.get("host") || request.nextUrl.hostname).split(":")[0].toLowerCase()
	const privatePath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/guest") || request.nextUrl.pathname.startsWith("/api")
	const ownerPath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname === "/api/health" || request.nextUrl.pathname.startsWith("/api/chatwoot/conversation/") || request.nextUrl.pathname.startsWith("/api/internal/calendar") || request.nextUrl.pathname.startsWith("/api/internal/cancellations") || request.nextUrl.pathname.startsWith("/api/internal/guest-access/") || request.nextUrl.pathname.startsWith("/api/internal/ota-price-observations") || request.nextUrl.pathname.startsWith("/api/internal/payments/") || request.nextUrl.pathname.startsWith("/api/internal/property-private-defaults") || request.nextUrl.pathname.startsWith("/api/internal/settings") || request.nextUrl.pathname.startsWith("/api/internal/telegram/") || request.nextUrl.pathname === "/api/internal/airbnb-calendar/status"
	const stagingHost = hostname.endsWith(".hostingersite.com")

	if (ownerPath) {
		const { userId } = await auth()
		const configuredOwnerId = process.env.HOST_OWNER_CLERK_USER_ID?.trim()
		if (userId && (!configuredOwnerId || userId !== configuredOwnerId))
			return NextResponse.json({ error: "Owner access is required." }, { status: 403, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } })
	}

	/**
	 * Hostinger's CDN previously retained rendered App Router documents from an
	 * earlier build while the origin had already switched to new chunk hashes.
	 * Never cache navigation documents at the CDN. The matcher below excludes
	 * `/_next/static`, so hashed JS/CSS assets remain immutable and cacheable.
	 */
	if (request.method === "GET" || request.method === "HEAD") {
		response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate")
	}
	if (stagingHost || privatePath) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
	response.headers.set("X-Content-Type-Options", "nosniff")
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
	response.headers.set("X-Frame-Options", "DENY")

	return response
})

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)"
	]
}
