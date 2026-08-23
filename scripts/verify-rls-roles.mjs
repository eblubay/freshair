import dotenv from "dotenv"
import postgres from "postgres"

dotenv.config({ path: ".env.local" })

const connectionString = process.env.POSTGRES_URL
if (!connectionString) throw new Error("POSTGRES_URL is required for RLS verification.")

const admin = postgres(connectionString)
const protectedTables = (await admin.unsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
	.map((row) => row.tablename)

async function scalar(client, statement) {
	const [row] = await client.unsafe(statement)
	return row?.count ?? 0
}

async function asRole(name, callback) {
	return admin.begin(async (transaction) => {
		await transaction.unsafe(`SET LOCAL ROLE ${name}`)
		const [identity] = await transaction.unsafe("SELECT current_user, session_user")
		if (identity?.current_user !== name) throw new Error(`Role switch to ${name} was not applied.`)
		return callback(transaction)
	})
}

async function assertReadDenied(name, table) {
	try {
		await asRole(name, async (transaction) => {
			const count = await scalar(transaction, `SELECT count(*)::int AS count FROM ${table}`)
			if (Number(count) !== 0) throw new Error(`${name} can read ${table}.`)
		})
	} catch (error) {
		if (error?.code !== "42501") throw error
	}
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

	const publicViews = await admin.unsafe("SELECT viewname AS name FROM pg_views WHERE schemaname='public' UNION ALL SELECT matviewname AS name FROM pg_matviews WHERE schemaname='public'")
	if (publicViews.length) throw new Error(`Unexpected public views: ${publicViews.map((view) => view.name).join(", ")}`)

	const publicRoutines = await admin.unsafe(`
		SELECT p.oid::regprocedure::text AS signature
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid=p.pronamespace
		WHERE n.nspname='public'
		AND (
			p.prosecdef
			OR has_function_privilege('public',p.oid,'EXECUTE')
			OR has_function_privilege('anon',p.oid,'EXECUTE')
			OR has_function_privilege('authenticated',p.oid,'EXECUTE')
		)
	`)
	if (publicRoutines.length) throw new Error(`Unexpected executable public routines: ${publicRoutines.map((routine) => routine.signature).join(", ")}`)

	const target = protectedTables.join(",")
	for (const name of ["anon", "authenticated"]) {
		for (const table of protectedTables) {
			await assertReadDenied(name, table)
			const [privileges] = await admin.unsafe(`SELECT has_table_privilege('${name}','public.${table}','SELECT') AS sel,has_table_privilege('${name}','public.${table}','INSERT') AS ins,has_table_privilege('${name}','public.${table}','UPDATE') AS upd,has_table_privilege('${name}','public.${table}','DELETE') AS del`)
			if (privileges.sel || privileges.ins || privileges.upd || privileges.del)
				throw new Error(`${name} retains a direct table privilege on ${table}.`)
		}
	}

	await asRole("service_role", async (transaction) => {
		for (const table of protectedTables) await scalar(transaction, `SELECT count(*)::int AS count FROM ${table}`)
	})

	console.log(JSON.stringify({ verified: true, protectedTables: target.split(","), roles: ["anon", "authenticated", "service_role"], publicViews: 0, executablePublicRoutines: 0 }))
} finally {
	await admin.end({ timeout: 1 })
}
