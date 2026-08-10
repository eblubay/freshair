import Image from "next/image"
import Link from "next/link"

/**
 * Official ShellByTheShore mark.
 *
 * The file lives at `public/branding/logo.png` and is rendered as-is:
 * only the displayed size changes, never the artwork itself.
 */
export const BRAND_NAME = "ShellByTheShore"
export const BRAND_LOGO_SRC = "/branding/logo.png"

/** Intrinsic artwork ratio (1024 × 1536) — never distort the mark. */
const LOGO_RATIO = 1024 / 1536

type BrandLogoProps = {
	/** Rendered height in px (width stays proportional). */
	height?: number
	className?: string
	priority?: boolean
}

export function BrandLogo({
	height = 48,
	className,
	priority = false
}: BrandLogoProps) {
	return (
		<Image
			src={BRAND_LOGO_SRC}
			alt={BRAND_NAME}
			width={Math.round(height * LOGO_RATIO)}
			height={height}
			priority={priority}
			className={className}
			style={{ height, width: "auto" }}
		/>
	)
}

export function BrandLogoLink({
	height = 48,
	priority = false,
	className
}: BrandLogoProps) {
	return (
		<Link href="/" aria-label={BRAND_NAME} className="inline-flex items-center">
			<BrandLogo height={height} priority={priority} className={className} />
		</Link>
	)
}
