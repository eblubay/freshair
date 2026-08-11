import { queryClient } from "@/lib/db"
import { allowDurableRateLimitedRequest } from "@/lib/rate-limit"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"
const schema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(254), requestType: z.enum(["ACCESS", "CORRECTION", "DELETION", "QUESTION", "DO_NOT_SELL_OR_SHARE"]), details: z.string().trim().max(4000).optional() })
export async function POST(request: Request) { const rate = await allowDurableRateLimitedRequest("privacy-request", request, 3, 60 * 60_000); if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Cache-Control": "no-store" } }); try { const data = schema.parse(await request.json()); await queryClient`INSERT INTO privacy_requests (id,request_type,name,email,details) VALUES (${nanoid()},${data.requestType},${data.name},${data.email},${data.details ?? null})`; return NextResponse.json({ received: true }, { status: 202, headers: { "Cache-Control": "no-store" } }) } catch { return NextResponse.json({ error: "Invalid privacy request." }, { status: 400, headers: { "Cache-Control": "no-store" } }) } }
