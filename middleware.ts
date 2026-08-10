import { clerkMiddleware } from "@clerk/nextjs/server"

/**
 * Clerk stays active on every route, but `/dashboard` is no longer hard-blocked
 * here: `auth.protect()` produced a 404 because this app ships no `/sign-in`
 * route. The dashboard page itself now renders Clerk's sign-in form for signed
 * out visitors, so the owner always gets a usable screen.
 */
export default clerkMiddleware()

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)"
	]
}
