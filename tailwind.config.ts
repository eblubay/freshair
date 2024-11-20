import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme"

export default {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}"
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)"
			},
			fontFamily: {
				sans: ["neue-haas-grotesk-text", ...fontFamily.sans],
				display: ["neue-haas-grotesk-display", ...fontFamily.sans]
			}
		}
	},
	plugins: []
} satisfies Config
