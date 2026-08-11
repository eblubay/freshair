/** Safely applies additive booking and cleaning schema migrations. Never drops data. */
import { config } from "dotenv"
import { readFile } from "node:fs/promises"
import postgres from "postgres"

config({ path: ".env.local" })
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is required")
const sql = postgres(url, { max: 1 })
try {
for (const filename of ["0002_direct_booking_foundation.sql", "0003_cleaning_bot.sql", "0004_operations_security.sql", "0005_rls_operational_data.sql", "0006_loyalty_referral_lifecycle.sql", "0007_legal_consent_and_privacy_requests.sql", "0008_verified_cancellation_and_house_rules.sql"]) {
		const migration = await readFile(`db/migrations/${filename}`, "utf8")
		await sql.unsafe(migration)
		console.log(`Applied ${filename}.`)
	}
	console.log("Direct-booking and cleaning migrations applied successfully.")
} finally {
	await sql.end({ timeout: 5 })
}
