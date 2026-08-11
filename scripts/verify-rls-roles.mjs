import dotenv from "dotenv"
import postgres from "postgres"

dotenv.config({ path: ".env.local" })

const connectionString = process.env.POSTGRES_URL
if (!connectionString) throw new Error("POSTGRES_URL is required for RLS verification.")

const admin = postgres(connectionString)
const protectedTables = [
	"reservations",
	"payments",
	"guest_access_tokens",
	"reservation_private_details",
	"property_private_defaults",
	"cleaning_tasks",
	"coupons",
	"referrals",
	"audit_events"
]

async function scalar(client, statement) {
	const [row] = await client.unsafe(statement)
	return row?.count ?? 0
}

try {
	const rls = await admin.unsafe(`
		SELECT tablename, rowsecurity
		FROM pg_tables
		WHERE schemaname='public' AND tablename IN (${protectedTables.map((table) => `'${table}'`).join(",")})
	`)
	if (rls.length !== protectedTables.length || rls.some((row) => !row.rowsecurity)) {
		throw new Error("RLS is not enabled on every protected operational table.")
	}

	const roles = await admin.unsafe("SELECT rolname,rolbypassrls FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')")
	const role = Object.fromEntries(roles.map((row) => [row.rolname, row.rolbypassrls]))
	if (role.anon || role.authenticated || !role.service_role) {
		throw new Error("Unexpected anon/authenticated/service_role RLS attributes.")
	}

	const target = protectedTables.join(",")
	for (const name of ["anon", "authenticated"]) {
		const client = postgres(connectionString, { connection: { options: `-c role=${name}` } })
		try {
			const count = await scalar(client, `SELECT count(*)::int AS count FROM reservations`)
			if (Number(count) !== 0) throw new Error(`${name} can read reservations.`)
		} finally {
			await client.end({ timeout: 1 })
		}
	}

	const service = postgres(connectionString, { connection: { options: "-c role=service_role" } })
	try {
		await scalar(service, `SELECT count(*)::int AS count FROM reservations`)
	} finally {
		await service.end({ timeout: 1 })
	}

	console.log(JSON.stringify({ verified: true, protectedTables: target.split(","), roles: ["anon", "authenticated", "service_role"] }))
} finally {
	await admin.end({ timeout: 1 })
}
