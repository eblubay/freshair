import { auth } from "@clerk/nextjs/server"
import { queryClient } from "@/lib/db"
import Link from "next/link"
import { SettingsForm } from "./SettingsForm"

import { PrivateArrivalDefaults } from "./PrivateArrivalDefaults"

export const metadata = { title: "Owner settings | ShellByTheShore", robots: { index: false, follow: false } }

export default async function SettingsPage() {
	const { userId } = await auth()
	if (!userId) return <main className="min-h-screen bg-[#fdfbf7] px-5 py-20 text-[#28323b]"><h1 className="font-serif text-4xl">Owner access required</h1><Link className="mt-6 inline-block underline" href="/dashboard">Sign in to configure operations</Link></main>
	try {
		const properties = await queryClient`SELECT p.id,p.name,b.direct_booking_enabled,b.base_nightly_rate,b.cleaning_fee,b.tax_rate_basis_points,b.min_stay_nights,b.max_stay_nights,b.min_booking_lead_hours,b.checkin_time,b.checkout_time,b.booking_hold_minutes,b.guest_secret_release_hours,COALESCE(ps.provider,'BRAINTREE') AS payment_provider,COALESCE(ps.sandbox_enabled,true) AS sandbox_enabled,COALESCE(ps.live_enabled,false) AS live_enabled,COALESCE(ps.card_enabled,true) AS card_enabled,COALESCE(ps.ach_enabled,false) AS ach_enabled,COALESCE(ps.stripe_enabled,false) AS stripe_enabled,COALESCE(cs.enabled,false) AS cleaning_enabled,COALESCE(cs.reminder_hours_before_deadline,6) AS reminder_hours,COALESCE(cs.urgent_reminder_minutes,60) AS urgent_reminder_minutes,COALESCE(cs.host_escalation_hours,2) AS escalation_hours,COALESCE(ls.enabled,false) AS loyalty_enabled,COALESCE(ls.welcome_back_enabled,false) AS welcome_back_enabled,ls.discount_type,ls.discount_value,ls.expiration_days,ls.max_uses,COALESCE(ls.referral_enabled,false) AS referral_enabled FROM properties p JOIN booking_settings b ON b.property_id=p.id LEFT JOIN payment_settings ps ON ps.property_id=p.id LEFT JOIN cleaning_settings cs ON cs.property_id=p.id LEFT JOIN loyalty_settings ls ON ls.property_id=p.id WHERE p.clerk_id=${userId} ORDER BY p.created_at`
		return <main className="min-h-screen bg-[#fdfbf7] px-5 py-14 text-[#28323b] sm:px-8 lg:px-14"><Link href="/dashboard" className="text-sm underline underline-offset-4">← Owner dashboard</Link><p className="mt-10 text-[11px] uppercase tracking-[.24em] text-[#8d7c66]">Owner control center</p><h1 className="mt-3 font-serif text-5xl">Booking operations settings</h1><p className="mt-4 max-w-3xl leading-relaxed text-[#5d6b78]">Configure rates, stay rules, payment activation posture, cleaning escalation, and loyalty. Provider credentials remain environment secrets and are never entered here.</p><SettingsForm properties={properties.map((row) => JSON.parse(JSON.stringify(row)))}/><PrivateArrivalDefaults properties={properties.map((row) => ({ id: String(row.id), name: String(row.name) }))}/></main>
	} catch { return <main className="min-h-screen bg-[#fdfbf7] px-5 py-20 text-[#28323b]"><h1 className="font-serif text-4xl">Settings setup required</h1><p className="mt-4 text-[#5d6b78]">Apply the additive booking migrations before configuring operations.</p></main> }
}
