import { SignIn } from "@clerk/nextjs"

export const metadata = { robots: { index: false, follow: false } }
import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import Link from "next/link"

type CleaningTaskRow = {
	id: string
	checkout_date: string
	checkout_source: string
	next_checkin_date: string | null
	next_arrival_source: string | null
	cleaning_deadline: string | null
	same_day_turnover: boolean
	priority: string
	status: string
	cleaner_name: string | null
}

export default async function CleaningDashboardPage() {
	const { userId } = await auth()
	if (!userId) return <main className="min-h-screen bg-[#fdfbf7] px-5 py-20"><h1 className="font-serif text-3xl text-[#28323b]">Owner access</h1><p className="mt-3 text-[#5d6b78]">Sign in to review private cleaning operations.</p><div className="mt-8"><SignIn routing="hash" /></div></main>

	let tasks: CleaningTaskRow[] = []
	let migrationRequired = false
	try {
		tasks = await queryClient<CleaningTaskRow[]>`
			SELECT t.id,t.checkout_date::text,t.checkout_source,t.next_checkin_date::text,t.next_arrival_source,t.cleaning_deadline::text,t.same_day_turnover,t.priority,t.status,c.name AS cleaner_name
			FROM cleaning_tasks t
			JOIN properties p ON p.id=t.property_id
			LEFT JOIN cleaners c ON c.id=t.assigned_cleaner_id
			WHERE t.status <> 'CANCELLED' AND p.clerk_id=${userId}
			ORDER BY t.cleaning_deadline NULLS LAST, t.checkout_date ASC LIMIT 30
		`
	} catch { migrationRequired = true }

	return <main className="min-h-screen bg-[#fdfbf7] px-5 py-12 text-[#28323b] sm:px-8 lg:px-14">
		<div className="mx-auto max-w-6xl">
			<Link href="/dashboard" className="text-sm font-semibold underline underline-offset-4">← Owner dashboard</Link>
			<div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6e7f88]">Private operations</p><h1 className="mt-2 font-serif text-4xl">Upcoming Turnovers</h1><p className="mt-3 max-w-2xl text-[#5d6b78]">Checkout → cleaning window → next arrival. Cleaner and guest information remain private.</p></div></div>
			{migrationRequired ? <section className="mt-10 border border-amber-300 bg-amber-50 p-6"><h2 className="font-semibold">Database setup required</h2><p className="mt-2 text-sm">Apply the additive booking and cleaning migrations before operational tasks can be displayed.</p></section> : <section className="mt-10 overflow-x-auto border border-[#e6ddcf] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#e6ddcf] bg-[#fffdfa] text-xs uppercase tracking-wide text-[#65737d]"><tr><th className="p-4">Checkout</th><th className="p-4">Next arrival</th><th className="p-4">Deadline</th><th className="p-4">Priority</th><th className="p-4">Cleaner</th><th className="p-4">Status</th></tr></thead><tbody>{tasks.length ? tasks.map((task) => <tr key={task.id} className="border-b border-[#eee7dd] last:border-0"><td className="p-4">{task.checkout_date}<span className="block text-xs text-[#65737d]">{task.checkout_source}</span></td><td className="p-4">{task.next_checkin_date ?? "No upcoming arrival"}<span className="block text-xs text-[#65737d]">{task.next_arrival_source ?? "Review calendar"}</span></td><td className="p-4">{task.cleaning_deadline ? new Date(task.cleaning_deadline).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }) : "No configured deadline"}</td><td className="p-4 font-semibold">{task.same_day_turnover ? "🚨 SAME-DAY" : task.priority}</td><td className="p-4">{task.cleaner_name ?? "Unassigned"}</td><td className="p-4">{task.status}</td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-[#65737d]">No upcoming cleaning tasks.</td></tr>}</tbody></table></section>}
		</div>
	</main>
}
