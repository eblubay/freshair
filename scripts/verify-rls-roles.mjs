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
	"audit_events",
	"booking_consents",
	"privacy_requests",
	"data_retention_settings",
	"cancellation_requests",
	"inquiries",
	"airbnb_shadow_events",
	"airbnb_calendar_state",
	"airbnb_sync_history",
	"availability_reliability_records",
	"inquiry_messages",
	"telegram_interactions",
	"operational_health_alerts"
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
			for (const table of protectedTables) {
				const count = await scalar(client, `SELECT count(*)::int AS count FROM ${table}`)
				if (Number(count) !== 0) throw new Error(`${name} can read ${table}.`)
				const [privileges] = await admin.unsafe(`SELECT has_table_privilege('${name}','public.${table}','INSERT') AS ins,has_table_privilege('${name}','public.${table}','UPDATE') AS upd,has_table_privilege('${name}','public.${table}','DELETE') AS del`)
				if (privileges.ins || privileges.upd || privileges.del) {
					const policies = await admin.unsafe(`SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='${table}' AND (roles @> ARRAY['${name}']::name[] OR roles @> ARRAY['public']::name[]) AND cmd IN ('ALL','INSERT','UPDATE','DELETE') LIMIT 1`)
					if (policies.length) throw new Error(`${name} has a mutation policy on ${table}.`)
				}
			}
		} finally {
			await client.end({ timeout: 1 })
		}
	}

	const service = postgres(connectionString, { connection: { options: "-c role=service_role" } })
	try {
		for (const table of protectedTables) await scalar(service, `SELECT count(*)::int AS count FROM ${table}`)
	} finally {
		await service.end({ timeout: 1 })
	}

	console.log(JSON.stringify({ verified: true, protectedTables: target.split(","), roles: ["anon", "authenticated", "service_role"] }))
} finally {
	await admin.end({ timeout: 1 })
}
