import "server-only"
import { queryClient } from "@/lib/db"

/** Deduplicated, quiet health foundation: healthy checks produce no messages. */
export async function recordOperationalProblem(kind: string, severity: "WARNING" | "CRITICAL", message: string, cooldownMinutes = 60) {
	const key = `${kind}:${severity}`
	const [row] = await queryClient`INSERT INTO operational_health_alerts (alert_key,kind,severity,message) VALUES (${key},${kind},${severity},${message.slice(0,500)}) ON CONFLICT (alert_key) DO UPDATE SET message=EXCLUDED.message,occurrence_count=operational_health_alerts.occurrence_count+1,last_seen_at=now(),resolved_at=NULL RETURNING last_notified_at`
	const shouldNotify = !row.last_notified_at || Date.now() - new Date(row.last_notified_at as string).getTime() > cooldownMinutes * 60_000
	if (shouldNotify) await queryClient`UPDATE operational_health_alerts SET last_notified_at=now() WHERE alert_key=${key}`
	return { key, shouldNotify, message }
}

export async function resolveOperationalProblem(kind: string, severity: "WARNING" | "CRITICAL") {
	await queryClient`UPDATE operational_health_alerts SET resolved_at=now() WHERE alert_key=${`${kind}:${severity}`} AND resolved_at IS NULL`
}
