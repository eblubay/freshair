export const OWNER_SIGN_IN_PATH = "/dashboard"
export const OWNER_DEFAULT_REDIRECT_PATH = "/dashboard/settings"

export type OwnerAccess =
	| { allowed: true; status: 200 }
	| { allowed: false; status: 401 | 403 }

export function ownerAccess(userId: string | null, configuredOwnerId = process.env.HOST_OWNER_CLERK_USER_ID): OwnerAccess {
	if (!userId) return { allowed: false, status: 401 }
	if (!configuredOwnerId?.trim() || userId !== configuredOwnerId.trim()) return { allowed: false, status: 403 }
	return { allowed: true, status: 200 }
}

export function safeOwnerRedirect(value: string | string[] | undefined) {
	const candidate = Array.isArray(value) ? value[0] : value
	if (!candidate?.startsWith("/dashboard") || candidate.startsWith("//")) return OWNER_DEFAULT_REDIRECT_PATH
	return candidate
}
