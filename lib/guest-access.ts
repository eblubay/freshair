import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { queryClient } from "@/lib/db"
import { nanoid } from "nanoid"

const algorithm = "aes-256-gcm"

function encryptionKey() {
	const raw = process.env.GUEST_SECRET_ENCRYPTION_KEY
	if (!raw) throw new Error("Guest private details are not configured.")
	return createHash("sha256").update(raw).digest()
}

export function hashGuestToken(token: string) {
	return createHash("sha256").update(token).digest("hex")
}

export function encryptGuestDetail(value: string) {
	const iv = randomBytes(12)
	const cipher = createCipheriv(algorithm, encryptionKey(), iv)
	const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
	const tag = cipher.getAuthTag()
	return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

export function decryptGuestDetail(value: string) {
	const [ivValue, tagValue, payload] = value.split(".")
	if (!ivValue || !tagValue || !payload) throw new Error("Invalid encrypted guest detail.")
	const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(ivValue, "base64url"))
	decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
	return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8")
}

export async function createGuestAccessToken(reservationId: string, expiresAt: Date) {
	const token = `${nanoid(24)}${nanoid(24)}`
	await queryClient`INSERT INTO guest_access_tokens (id,reservation_id,token_hash,expires_at) VALUES (${nanoid()},${reservationId},${hashGuestToken(token)},${expiresAt.toISOString()}::timestamptz)`
	return token
}

export async function getGuestPortalReservation(token: string) {
	const [row] = await queryClient`
		SELECT r.confirmation_code, r.guest_first_name, r.check_in::text, r.check_out::text,
			b.guest_secret_release_hours, d.door_code_ciphertext, d.wifi_name_ciphertext,
			d.wifi_password_ciphertext, d.private_checkin_notes_ciphertext, d.parking_private_notes_ciphertext,
			pd.door_code_ciphertext AS default_door_code_ciphertext,pd.wifi_name_ciphertext AS default_wifi_name_ciphertext,
			pd.wifi_password_ciphertext AS default_wifi_password_ciphertext,pd.private_checkin_notes_ciphertext AS default_private_checkin_notes_ciphertext,pd.parking_private_notes_ciphertext AS default_parking_private_notes_ciphertext
		FROM guest_access_tokens t
		JOIN reservations r ON r.id=t.reservation_id
		JOIN booking_settings b ON b.property_id=r.property_id
		LEFT JOIN reservation_private_details d ON d.reservation_id=r.id
		LEFT JOIN property_private_defaults pd ON pd.property_id=r.property_id
		WHERE t.token_hash=${hashGuestToken(token)}
			AND t.expires_at > now()
			AND t.revoked_at IS NULL
	`
	if (!row) return null
	const releaseAt = new Date(`${row.check_in}T00:00:00.000Z`).getTime() - Number(row.guest_secret_release_hours) * 3_600_000
	const canShowPrivateDetails = Date.now() >= releaseAt
	return {
		confirmationCode: row.confirmation_code as string,
		guestFirstName: row.guest_first_name as string,
		checkIn: row.check_in as string,
		checkOut: row.check_out as string,
		privateDetailsAvailable: canShowPrivateDetails,
		privateDetails: canShowPrivateDetails && (row.door_code_ciphertext || row.default_door_code_ciphertext) ? {
			doorCode: decryptGuestDetail((row.door_code_ciphertext ?? row.default_door_code_ciphertext) as string),
			wifiName: (row.wifi_name_ciphertext ?? row.default_wifi_name_ciphertext) ? decryptGuestDetail((row.wifi_name_ciphertext ?? row.default_wifi_name_ciphertext) as string) : null,
			wifiPassword: (row.wifi_password_ciphertext ?? row.default_wifi_password_ciphertext) ? decryptGuestDetail((row.wifi_password_ciphertext ?? row.default_wifi_password_ciphertext) as string) : null,
			checkinNotes: (row.private_checkin_notes_ciphertext ?? row.default_private_checkin_notes_ciphertext) ? decryptGuestDetail((row.private_checkin_notes_ciphertext ?? row.default_private_checkin_notes_ciphertext) as string) : null,
			parkingNotes: (row.parking_private_notes_ciphertext ?? row.default_parking_private_notes_ciphertext) ? decryptGuestDetail((row.parking_private_notes_ciphertext ?? row.default_parking_private_notes_ciphertext) as string) : null
		} : null
	}
}
