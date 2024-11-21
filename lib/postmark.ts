import { ServerClient } from "postmark"

if (!process.env.POSTMARK_API_TOKEN) {
	throw new Error("Missing POSTMARK_API_TOKEN environment variable")
}

export const postmark = new ServerClient(process.env.POSTMARK_API_TOKEN)

export const FROM_EMAIL = "contact@bjornpagen.com" // Replace with your verified sender signature
