import { rewardCompletedStay, createReferral, qualifyReferral } from "@/lib/loyalty-domain"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ reservationId: z.string().min(8) })

export async function POST(request: Request) {
	if (!process.env.AUTOMATION_SECRET || request.headers.get("x-automation-secret") !== process.env.AUTOMATION_SECRET) return NextResponse.json({ error: "Unauthorized automation." }, { status: 401 })
	try { const { reservationId } = schema.parse(await request.json()); const [welcomeBack, referral, referralReward] = await Promise.all([rewardCompletedStay(reservationId), createReferral(reservationId), qualifyReferral(reservationId)]); return NextResponse.json({ welcomeBack, referral, referralReward }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Loyalty processing failed." }, { status: 400 }) }
}
