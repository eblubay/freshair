import { NextResponse } from "next/server"

const productionHost = "shellbytheshore.com"
const productionUrl = `https://${productionHost}`
const noIndex = "noindex, nofollow, noarchive"

export const dynamic = "force-dynamic"

function normalizedHostname(value: string | null): string {
	return (value ?? "").split(",")[0].trim().split(":")[0].toLowerCase()
}

function robotsResponse(request: Request): Response {
	const forwardedHost = normalizedHostname(request.headers.get("x-forwarded-host"))
	const host = normalizedHostname(request.headers.get("host"))
	const urlHost = normalizedHostname(new URL(request.url).hostname)
	const requestedHost = forwardedHost || host || urlHost
	const isStaging = [forwardedHost, host, urlHost].some((hostname) =>
		hostname.endsWith(".hostingersite.com")
	)
	const isProduction = !isStaging && requestedHost === productionHost
	const body = isProduction
		? [
				"User-agent: *",
				"Allow: /",
				"Disallow: /api/",
				"Disallow: /dashboard/",
				"Disallow: /guest/",
				"",
				`Sitemap: ${productionUrl}/sitemap.xml`,
				`Host: ${productionUrl}`,
				""
			].join("\n")
		: "User-agent: *\nDisallow: /\n"

	return new NextResponse(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "private, no-store, max-age=0",
			Vary: "Host, X-Forwarded-Host",
			...(isProduction ? {} : { "X-Robots-Tag": noIndex })
		}
	})
}

export function GET(request: Request): Response {
	return robotsResponse(request)
}
