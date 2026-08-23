import { writeFile } from "node:fs/promises"
import matrix from "../knowledge/question-matrix.json"
import { answerConciergeDeterministically } from "../lib/concierge"

const SAMPLE_SIZE = 240
async function main() {
const rows = matrix.qualityQuestions.slice(0, SAMPLE_SIZE).map((item) => {
	const result = answerConciergeDeterministically(item.question)
	const grounded = item.expectedKnowledgeIds.some((id) => result.metadata.knowledgeIds.includes(id))
	const sourced = item.expectedSourceIds.some((id) => result.metadata.sourceIds.includes(id))
	const named = item.expectedTerms.some((term) => result.answer.toLowerCase().includes(term.toLowerCase()))
	const safe = !item.liveDataDependent || (result.metadata.liveDataNeeded && /change|current|directly|aggiornat|actual|actuel|aktuell/i.test(result.answer))
	const useful = result.answer.length >= 90 && !/\*\*Is .+ available\?\*\*/i.test(result.answer)
	const grade = grounded && sourced && named && safe && useful ? "GOOD" : grounded && sourced && safe && result.answer.length >= 60 ? "WEAK" : "BAD"
	return { question: item.question, grade, grounded, sourced, expectedNamePresent: named, liveSafetyPresent: safe, answerLength: result.answer.length, answerType: result.metadata.answerType }
})
const counts = { GOOD: rows.filter((row) => row.grade === "GOOD").length, WEAK: rows.filter((row) => row.grade === "WEAK").length, BAD: rows.filter((row) => row.grade === "BAD").length }
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), command: "npm run concierge:quality", samplePolicy: `first ${SAMPLE_SIZE} natural alternative questions; canonical wording and QA ids excluded`, criteria: { GOOD: "grounded + sourced + expected place/content term + live safety when needed + useful length", WEAK: "grounded + sourced + live-safe + minimally useful", BAD: "fails grounding, sourcing, live safety, or minimum usefulness" }, totalAvailable: matrix.qualityQuestions.length, evaluated: rows.length, counts, percentages: { GOOD: Number(((counts.GOOD / rows.length) * 100).toFixed(2)), WEAK: Number(((counts.WEAK / rows.length) * 100).toFixed(2)), BAD: Number(((counts.BAD / rows.length) * 100).toFixed(2)) }, rows }
await writeFile("knowledge/quality-report.json", `${JSON.stringify(report, null, 2)}\n`)
console.log(`Concierge quality report: ${rows.length} questions; GOOD=${counts.GOOD} (${report.percentages.GOOD}%) WEAK=${counts.WEAK} (${report.percentages.WEAK}%) BAD=${counts.BAD} (${report.percentages.BAD}%)`)
if (counts.GOOD < 228 || counts.WEAK > 12 || counts.BAD !== 0) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
