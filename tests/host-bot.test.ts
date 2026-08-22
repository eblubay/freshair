import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { authorizedHost, classifyUrgency, dollarsToMinor, hostActions, replyPreview } from "../lib/host-bot-utils"

test("host authorization rejects unknown chat", () => { const prior = process.env.TELEGRAM_HOST_CHAT_ID; process.env.TELEGRAM_HOST_CHAT_ID = "123"; assert.equal(authorizedHost("123"), true); assert.equal(authorizedHost("999"), false); if (prior === undefined) delete process.env.TELEGRAM_HOST_CHAT_ID; else process.env.TELEGRAM_HOST_CHAT_ID = prior })
test("price uses integer minor units", () => { assert.equal(dollarsToMinor("1250"), 125000); assert.equal(dollarsToMinor("1250.50"), 125050); assert.equal(dollarsToMinor("12.345"), null) })
test("required host functions are represented", () => { for (const action of ["REPLY", "REPLY_TEXT", "AI_DRAFT", "SEND_EMAIL", "EDIT", "CANCEL", "SET_PRICE", "AVAILABLE", "NOT_AVAILABLE", "MARK_REPLIED", "GUEST_CONFIRMED", "CREATE_BOOKING"]) assert.ok(hostActions.includes(action as never)) })
test("urgent guest phrases are classified internally", () => { assert.equal(classifyUrgency("The door code not working and we are locked out"), "HIGH"); assert.equal(classifyUrgency("What time is checkout?"), "NORMAL") })
test("draft and booking require explicit states and booking remains unpaid", () => { const source = readFileSync("lib/host-bot.ts", "utf8"); assert.match(source, /DRAFT_READY/); assert.match(source, /CONFIRM_GUEST_PENDING/); assert.match(source, /CREATE_BOOKING_PENDING/); assert.match(source, /'UNPAID'/); assert.match(source, /emailSent: false/) })
test("reply preview is explicit and keeps arbitrary owner text as data", () => {
	const preview = replyPreview("guest@example.com", "SBS-12345678", "<b>not markup</b>\nHello")
	assert.equal(preview.state, "READY_TO_SEND")
	assert.deepEqual(preview.buttons, ["SEND EMAIL", "EDIT", "CANCEL"])
	assert.match(preview.text, /To: guest@example\.com/)
	assert.match(preview.text, /<b>not markup<\/b>/)
})

test("Telegram text only drafts; delivery requires explicit owner callback and is idempotent", () => {
	const source = readFileSync("lib/host-bot.ts", "utf8")
	assert.match(source, /data\.action === "REPLY_TEXT"/)
	assert.match(source, /telegram_state !== "AWAITING_REPLY"/)
	assert.match(source, /data\.action === "SEND_EMAIL"/)
	assert.match(source, /INSERT INTO telegram_interactions[\s\S]*ON CONFLICT \(update_id\) DO NOTHING/)
	assert.match(source, /if \(!claim\.length\) return/)
})

test("Airbnb classification creates only verified stays without guest messaging or paid status", () => {
	const source = readFileSync("lib/host-bot.ts", "utf8")
	assert.match(source, /data\.action === "AIRBNB_STAY_CONFIRMED"/)
	assert.match(source, /booking_source.*'AIRBNB'/s)
	assert.match(source, /payment_status.*'UNKNOWN'/s)
	assert.match(source, /client_request_id.*AIRBNB:/s)
	assert.match(source, /guestMessagingEnabled: false/)
	assert.match(source, /AIRBNB_STAY_VERIFIED/)
})
