import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import { calendarHealth } from "@/lib/shadow-advisory"
import { NextResponse } from "next/server"

export async function GET() {
	const { userId } = await auth()
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const [state] = await queryClient`SELECT * FROM airbnb_calendar_state WHERE source='AIRBNB_ICAL'`
	const [metrics] = await queryClient`SELECT count(*)::int total_syncs,count(*) FILTER (WHERE successful)::int successful_syncs,count(*) FILTER (WHERE NOT successful)::int failed_syncs FROM airbnb_sync_history`
	const [comparisons] = await queryClient`SELECT count(*)::int owner_advisory_comparisons,count(*) FILTER (WHERE comparison_result='MATCH')::int matches,count(*) FILTER (WHERE comparison_result='MISMATCH')::int mismatches,count(*) FILTER (WHERE stale_at_decision)::int stale_at_decision_count FROM availability_reliability_records`
	return NextResponse.json({ health: calendarHealth({ configured: Boolean(process.env.AIRBNB_ICAL_URL), lastSuccess: state?.last_successful_sync ? new Date(state.last_successful_sync as string) : null, lastSyncSuccess: state?.last_sync_success as boolean | null ?? null }), state, metrics, comparisons }, { headers: { "Cache-Control": "no-store" } })
}
