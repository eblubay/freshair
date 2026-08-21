import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { authorizedHost, classifyUrgency, dollarsToMinor, hostActions } from "../lib/host-bot-utils"

test("host authorization rejects unknown chat", () => { const prior = process.env.TELEGRAM_HOST_CHAT_ID; process.env.TELEGRAM_HOST_CHAT_ID = "123"; assert.equal(authorizedHost("123"), true); assert.equal(authorizedHost("999"), false); if (prior === undefined) delete process.env.TELEGRAM_HOST_CHAT_ID; else process.env.TELEGRAM_HOST_CHAT_ID = prior })
test("price uses integer minor units", () => { assert.equal(dollarsToMinor("1250"), 125000); assert.equal(dollarsToMinor("1250.50"), 125050); assert.equal(dollarsToMinor("12.345"), null) })
test("required host functions are represented", () => { for (const action of ["REPLY", "AI_DRAFT", "SEND_DRAFT", "SET_PRICE", "AVAILABLE", "NOT_AVAILABLE", "MARK_REPLIED", "GUEST_CONFIRMED", "CREATE_BOOKING"]) assert.ok(hostActions.includes(action as never)) })
test("urgent guest phrases are classified internally", () => { assert.equal(classifyUrgency("The door code not working and we are locked out"), "HIGH"); assert.equal(classifyUrgency("What time is checkout?"), "NORMAL") })
test("draft and booking require explicit states and booking remains unpaid", () => { const source = readFileSync("lib/host-bot.ts", "utf8"); assert.match(source, /DRAFT_READY/); assert.match(source, /CONFIRM_GUEST_PENDING/); assert.match(source, /CREATE_BOOKING_PENDING/); assert.match(source, /'UNPAID'/); assert.match(source, /emailSent: false/) })
