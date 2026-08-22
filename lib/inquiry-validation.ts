import { z } from "zod"

const text = (max: number) => z.string().trim().max(max).transform((value) => value.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim())

export const inquirySchema = z.object({
	propertyId: z.string().trim().min(1).max(100),
	checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date"),
	checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date"),
	guests: z.coerce.number().int().min(1),
	firstName: text(80).pipe(z.string().min(1, "Please enter your first name")),
	lastName: text(80).pipe(z.string().min(1, "Please enter your last name")),
	email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(254),
	phone: text(40).optional().or(z.literal("")),
	message: text(2000).optional().or(z.literal("")),
	website: z.string().max(200).optional().default(""),
	idempotencyKey: z.string().uuid()
})

export type AvailabilityRequestInput = z.input<typeof inquirySchema>
export type AvailabilityRequestResult = { ok: true; emailSent: boolean; reference: string } | { ok: false; error: string }
