import "server-only"

import { queryClient } from "@/lib/db"

type LimitEntry = { count: number; resetAt: number }

const entries = new Map<string, LimitEntry>()

/** Process-local safety valve; replace with a shared store when horizontally scaled. */
export function allowRateLimitedRequest(scope: string, request: Request, limit = 12, windowMs = 60_000) {
	const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	const client = forwarded || request.headers.get("x-real-ip") || "unknown"
	const key = `${scope}:${client}`
	const now = Date.now()
	const current = entries.get(key)
	if (!current || current.resetAt <= now) {
		entries.set(key, { count: 1, resetAt: now + windowMs })
		return { allowed: true, retryAfterSeconds: 0 }
	}
	current.count += 1
	return { allowed: current.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
}

export async function allowDurableRateLimitedRequest(scope: string, request: Request, limit = 12, windowMs = 60_000) {
	const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	const client = forwarded || request.headers.get("x-real-ip") || "unknown"
	const bucketKey = `${scope}:${client}`
	try {
		const [row] = await queryClient.begin(async (tx) => {
			await tx`DELETE FROM rate_limit_buckets WHERE expires_at <= now()`
			const expiresAt = new Date(Date.now() + windowMs).toISOString()
			return tx`INSERT INTO rate_limit_buckets (bucket_key,count,window_started_at,expires_at,updated_at) VALUES (${bucketKey},1,now(),${expiresAt}::timestamptz,now()) ON CONFLICT (bucket_key) DO UPDATE SET count=CASE WHEN rate_limit_buckets.expires_at <= now() THEN 1 ELSE rate_limit_buckets.count + 1 END, window_started_at=CASE WHEN rate_limit_buckets.expires_at <= now() THEN now() ELSE rate_limit_buckets.window_started_at END, expires_at=CASE WHEN rate_limit_buckets.expires_at <= now() THEN ${expiresAt}::timestamptz ELSE rate_limit_buckets.expires_at END, updated_at=now() RETURNING count, expires_at`
		})
		const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.expires_at as string).getTime() - Date.now()) / 1000))
		return { allowed: Number(row.count) <= limit, retryAfterSeconds, durable: true }
	} catch {
		const local = allowRateLimitedRequest(scope, request, limit, windowMs)
		return { ...local, durable: false }
	}
}
