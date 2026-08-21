import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

/**
 * Lazy SMTP transporter.
 *
 * Previously this module threw at import-time when any SMTP env var was
 * missing. Because it is imported (transitively) by server actions used in
 * page rendering, a single missing variable produced a hard 500 / worker
 * crash for the whole route. Now configuration is resolved on demand and
 * missing configuration is reported by the caller instead of taking the
 * process down.
 */

let cached: Transporter | null = null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isSmtpConfigured(): boolean {
	return Boolean(
		process.env.SMTP_HOST &&
			process.env.SMTP_PORT &&
			(process.env.SMTP_USERNAME || process.env.SMTP_USER) &&
			process.env.SMTP_PASSWORD
	)
}

export function getTransporter(): Transporter {
	if (!isSmtpConfigured()) {
		throw new Error("SMTP is not configured")
	}

	if (!cached) {
		cached = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number.parseInt(process.env.SMTP_PORT as string, 10),
			secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : process.env.SMTP_PORT === "465",
			auth: {
				user: (process.env.SMTP_USERNAME || process.env.SMTP_USER) as string,
				pass: process.env.SMTP_PASSWORD as string
			}
		})
	}

	return cached
}

/**
 * The envelope sender. `FROM_EMAIL` is used only when it is a syntactically
 * valid address — a malformed value made Hostinger reject every message with
 * "501 5.1.7 Bad sender address syntax", so the authenticated SMTP user is the
 * fallback.
 */
export function getFromEmail(): string {
	const configured = (process.env.SMTP_FROM_EMAIL ?? process.env.FROM_EMAIL ?? "stay@shellbytheshore.com").trim()

	if (EMAIL.test(configured)) return configured

	const user = (process.env.SMTP_USERNAME ?? process.env.SMTP_USER ?? "").trim()

	if (configured.length > 0 && EMAIL.test(user)) {
		console.warn(
			"[smtp] FROM_EMAIL is not a valid address; falling back to SMTP_USER."
		)
	}

	return EMAIL.test(user) ? user : ""
}
