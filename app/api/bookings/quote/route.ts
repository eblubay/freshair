import { createQuote } from "@/lib/booking-domain"
import { NextResponse } from "next/server"
export async function POST(request: Request) { try { return NextResponse.json(await createQuote(await request.json()), { headers: { "Cache-Control": "no-store" } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare quote." }, { status: 400 }) } }
