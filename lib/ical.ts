import { createHash } from "crypto"

export type ImportedCalendarEvent = { uid: string; checkIn: string; checkOut: string; summary: string | null; sequence: number | null; rawHash: string }

const unfold = (value: string) => value.replace(/\r?\n[ \t]/g, "")
const unescape = (value: string) => value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")

function parseDate(value: string) {
	const normalized = value.trim().replace(/[^0-9]/g, "")
	if (normalized.length < 8) return null
	return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`
}

/** Minimal RFC 5545 VEVENT reader for all-day OTA availability feeds. */
export function parseIcalEvents(content: string): ImportedCalendarEvent[] {
	const blocks = unfold(content).split(/BEGIN:VEVENT\r?\n/i).slice(1)
	const events: ImportedCalendarEvent[] = []
	for (const block of blocks) {
		const end = block.search(/END:VEVENT/i)
		const event = end === -1 ? block : block.slice(0, end)
		const values = new Map<string, string>()
		for (const line of event.split(/\r?\n/)) {
			const separator = line.indexOf(":")
			if (separator < 0) continue
			const name = line.slice(0, separator).split(";", 1)[0].toUpperCase()
			if (["UID", "DTSTART", "DTEND", "SUMMARY", "SEQUENCE"].includes(name)) values.set(name, line.slice(separator + 1).trim())
		}
		const uid = values.get("UID")
		const checkIn = values.get("DTSTART") && parseDate(values.get("DTSTART")!)
		const checkOut = values.get("DTEND") && parseDate(values.get("DTEND")!)
		if (!uid || !checkIn || !checkOut || checkOut <= checkIn) continue
		events.push({ uid, checkIn, checkOut, summary: values.get("SUMMARY") ? unescape(values.get("SUMMARY")!) : null, sequence: values.get("SEQUENCE") ? Number(values.get("SEQUENCE")) || 0 : null, rawHash: createHash("sha256").update(event).digest("hex") })
	}
	return events
}
