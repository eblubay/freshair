import "server-only"

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
