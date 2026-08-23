import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

/**
 * Clerk stays active on every route, but `/dashboard` is no longer hard-blocked
 * here: `auth.protect()` produced a 404 because this app ships no `/sign-in`
 * route. The dashboard page itself now renders Clerk's sign-in form for signed
 * out visitors, so the owner always gets a usable screen.
 */
export default clerkMiddleware((auth, request) => {
	const response = NextResponse.next()
	const hostname = request.nextUrl.hostname.toLowerCase()
	const privatePath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/guest") || request.nextUrl.pathname.startsWith("/api")

	/**
	 * Hostinger's CDN previously retained rendered App Router documents from an
	 * earlier build while the origin had already switched to new chunk hashes.
	 * Never cache navigation documents at the CDN. The matcher below excludes
	 * `/_next/static`, so hashed JS/CSS assets remain immutable and cacheable.
	 */
	if (request.method === "GET" || request.method === "HEAD") {
		response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate")
	}
	if (hostname.endsWith(".hostingersite.com") || privatePath) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
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
