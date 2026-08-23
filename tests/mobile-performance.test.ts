import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("only the real hero LCP image is prioritized on public property pages", () => {
	for (const page of ["app/(marketing)/page.tsx", "app/listing/[id]/page.tsx"]) {
		const source = read(page)
		assert.match(source, /<Image[\s\S]*?sizes="100vw"[\s\S]*?priority/)
		assert.equal((source.match(/\bpriority\b/g) ?? []).length, 1)
	}

	assert.doesNotMatch(read("app/_components/SiteHeader.tsx"), /priority/)
	assert.match(read("app/_components/PhotoGallery.tsx"), /loading="lazy"/)
})

test("MapLibre is isolated behind a viewport-triggered dynamic import", () => {
	const deferred = read("app/_components/DeferredPropertyMap.tsx")
	assert.match(deferred, /dynamic\(/)
	assert.match(deferred, /ssr: false/)
	assert.match(deferred, /IntersectionObserver/)
	assert.match(deferred, /rootMargin: "600px 0px"/)
	assert.match(deferred, /maplibre-gl\/dist\/maplibre-gl\.css/)
	assert.doesNotMatch(read("app/globals.css"), /maplibre/)
})

test("public pages retain server-rendered SEO copy while interactive islands stay isolated", () => {
	for (const page of ["app/(marketing)/page.tsx", "app/listing/[id]/page.tsx"]) {
		const source = read(page)
		assert.doesNotMatch(source, /^"use client"/)
		assert.match(source, /property\.descriptionParagraphs/)
		assert.match(source, /<h1/)
	}
	assert.doesNotMatch(read("app/layout.tsx"), /ClerkProvider/)
	assert.match(read("app/dashboard/layout.tsx"), /ClerkProvider/)
})

test("public documents bypass Clerk middleware and remain cache friendly", () => {
	const middleware = read("middleware.ts")
	assert.match(middleware, /if \(privatePath\) return privateMiddleware/)
	assert.match(middleware, /public, s-maxage=300, stale-while-revalidate=60/)
	assert.match(middleware, /hostingersite\.com/)

	for (const page of ["app/(marketing)/page.tsx", "app/listing/[id]/page.tsx"]) {
		assert.match(read(page), /export const revalidate = 3600/)
	}
	const viewModel = read("lib/view-model.ts")
	assert.match(viewModel, /unstable_cache/)
	assert.match(viewModel, /select\(\{ id: properties\.id, listingData: properties\.listingData \}\)/)
	assert.doesNotMatch(viewModel, /from\((?:inquiries|bookings|customers|guests)\)/)
})

test("unused Adobe kit cannot block first paint", () => {
	const layout = read("app/layout.tsx")
	assert.doesNotMatch(layout, /typekit|gnn8txw/)
	assert.doesNotMatch(layout, /rel="preconnect"/)
})

test("image optimizer serves constrained modern variants with a durable cache", () => {
	const config = read("next.config.ts")
	assert.match(config, /formats: \["image\/avif", "image\/webp"\]/)
	assert.match(config, /deviceSizes: \[360, 414, 640, 750, 828, 1080, 1200, 1920\]/)
	assert.match(config, /minimumCacheTTL: 2_592_000/)
	assert.match(config, /remotePatterns/)
})
