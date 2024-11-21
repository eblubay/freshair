import { clerkClient } from "@clerk/nextjs/server"
import "server-only"

export async function getUserEmailAddresses(clerkId: string) {
	try {
		const client = await clerkClient()
		return (await client.users.getUser(clerkId)).emailAddresses
			.filter((email) => email.verification)
			.map((email) => email.emailAddress)
	} catch (error) {
		console.error("Error fetching user email info:", error)
		throw error
	}
}
