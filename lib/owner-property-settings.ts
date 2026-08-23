import { queryClient } from "@/lib/db"
import "server-only"

/**
 * Binds the sole existing production property to the allowlisted Clerk owner when
 * Clerk instance cutover changed the user ID, then initializes only missing
 * booking defaults. It never inserts, deletes, or rewrites listing content.
 */
export async function ensureOwnerPropertySettings(ownerUserId: string) {
	return queryClient.begin(async (tx) => {
		let [property] = await tx`SELECT id FROM properties WHERE clerk_id=${ownerUserId} ORDER BY created_at LIMIT 1 FOR UPDATE`
		if (!property) {
			const existing = await tx`SELECT id FROM properties ORDER BY created_at LIMIT 2 FOR UPDATE`
			if (existing.length !== 1) return null
			;[property] = existing
			await tx`UPDATE properties SET clerk_id=${ownerUserId} WHERE id=${property.id}`
		}

		await tx`INSERT INTO booking_settings (property_id) VALUES (${property.id}) ON CONFLICT (property_id) DO NOTHING`
		return String(property.id)
	})
}
