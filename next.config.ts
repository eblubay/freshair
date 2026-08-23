import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	images: {
		domains: ["a0.muscache.com"],
		formats: ["image/avif", "image/webp"],
		deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920]
	}
}

export default nextConfig
