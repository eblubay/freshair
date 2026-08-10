import nodemailer from "nodemailer"

if (!process.env.SMTP_HOST) {
	throw new Error("Missing SMTP_HOST environment variable")
}

if (!process.env.SMTP_PORT) {
	throw new Error("Missing SMTP_PORT environment variable")
}

if (!process.env.SMTP_USER) {
	throw new Error("Missing SMTP_USER environment variable")
}

if (!process.env.SMTP_PASSWORD) {
	throw new Error("Missing SMTP_PASSWORD environment variable")
}

if (!process.env.FROM_EMAIL) {
	throw new Error("Missing FROM_EMAIL environment variable")
}

export const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number.parseInt(process.env.SMTP_PORT),
	secure: process.env.SMTP_PORT === "465",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD
	}
})

export const FROM_EMAIL = process.env.FROM_EMAIL
