import type { MetadataRoute } from "next"

const productionUrl = "https://shellbytheshore.com"
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "")

export default function robots(): MetadataRoute.Robots {
	if (siteUrl !== productionUrl) return { rules: { userAgent: "*", disallow: "/" } }
	return {
		rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/guest/"] }],
		sitemap: `${productionUrl}/sitemap.xml`,
		host: productionUrl
	}
}
