import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	images: {
		formats: ["image/avif", "image/webp"],
		deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
		imageSizes: [32, 48, 64, 96, 128, 256],
		minimumCacheTTL: 2_592_000,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "a0.muscache.com",
				pathname: "/im/pictures/**"
			}
		]
	}
}

export default nextConfig
