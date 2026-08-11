import { auth } from "@clerk/nextjs/server"
import { requestCancellation } from "@/lib/cancellation-domain"
import { queryClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"
const schema = z.object({ reservationId: z.string().min(8) })
export async function POST(request: Request) { const { userId } = await auth(); if (!userId) return NextResponse.json({ error: "Owner authentication is required." }, { status: 401, headers: { "Cache-Control": "no-store" } }); try { const { reservationId } = schema.parse(await request.json()); const [owned] = await queryClient`SELECT r.id FROM reservations r JOIN properties p ON p.id=r.property_id WHERE r.id=${reservationId} AND p.clerk_id=${userId}`; if (!owned) return NextResponse.json({ error: "Reservation not found." }, { status: 404, headers: { "Cache-Control": "no-store" } }); return NextResponse.json(await requestCancellation(reservationId), { headers: { "Cache-Control": "no-store" } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to evaluate cancellation." }, { status: 400, headers: { "Cache-Control": "no-store" } }) } }
