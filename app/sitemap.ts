import type { MetadataRoute } from "next"

const productionUrl = "https://shellbytheshore.com"

export default function sitemap(): MetadataRoute.Sitemap {
	return ["", "/guide", "/privacy-policy", "/privacy-choices", "/terms-and-conditions", "/accessibility", "/house-guide"].map((path) => ({
		url: `${productionUrl}${path}`,
		changeFrequency: path === "" ? "weekly" : "monthly",
		priority: path === "" ? 1 : path === "/guide" ? 0.8 : 0.4
	}))
}
