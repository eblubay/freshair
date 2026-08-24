import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd(); const languages = ["en", "it", "es", "fr", "de"]
const normalize = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
const languageMarkers = { en: [" the ", " is ", "where", "what"], it: [" il ", " la ", "dove", "cosa", "verifica"], es: [" el ", " la ", "donde", "qué", "consulta"], fr: [" le ", " la ", "où", "quoi", "vérifiez"], de: [" der ", " die ", "wo ", "was ", "bitte"] }
const forbidden = [/paired with another verified stop/i, /avoid (?:unnecessary )?backtracking/i, /ï¿½|Ã.|â€™|â€œ|â€|�/]
function similarity(a, b) { const one = new Set(normalize(a).split(" ").filter((word) => word.length > 2)); const two = new Set(normalize(b).split(" ").filter((word) => word.length > 2)); if (one.size < 6 || two.size < 6) return 0; let overlap = 0; for (const word of one) if (two.has(word)) overlap++; return overlap / Math.max(1, new Set([...one, ...two]).size) }
async function main() {
	const massive = JSON.parse(await readFile(path.join(root, "knowledge/massive-local-qa.json"), "utf8")); const places = JSON.parse(await readFile(path.join(root, "knowledge/local-places.json"), "utf8"))
	const errors = []; const ids = new Set(); const questions = new Set(); const answers = new Map(); const placeIds = new Set(); let variants = 0; let localized = 0
	for (const place of places.places) {
		if (!place.id || placeIds.has(place.id)) errors.push(`invalid or duplicate place id: ${place.id}`); placeIds.add(place.id)
		if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || place.latitude < -90 || place.latitude > 90 || place.longitude < -180 || place.longitude > 180) errors.push(`invalid coordinates: ${place.id}`)
		if (!place.name || !place.source_id || !place.category) errors.push(`missing required place fields: ${place.id}`)
	}
	for (const qa of massive.qas) {
		if (!qa.id || ids.has(qa.id)) errors.push(`invalid or duplicate QA id: ${qa.id}`); ids.add(qa.id)
		if (!placeIds.has(qa.placeId)) errors.push(`unsupported place grounding: ${qa.id}`)
		for (const language of languages) {
			const local = qa.localizations[language]; if (!local?.question || !local.answer || !Array.isArray(local.alternativeQuestions) || local.alternativeQuestions.length < 3) { errors.push(`missing locale: ${qa.id}/${language}`); continue }
			localized++; variants += local.alternativeQuestions.length
			const key = `${language}:${normalize(local.question)}`; if (questions.has(key)) errors.push(`duplicate question: ${key}`); questions.add(key)
			if (forbidden.some((pattern) => pattern.test(local.answer))) errors.push(`forbidden output: ${qa.id}/${language}`)
			if (!languageMarkers[language].some((marker) => ` ${normalize(local.answer)} `.includes(normalize(marker)))) errors.push(`language marker missing: ${qa.id}/${language}`)
			const answerKey = `${language}:${normalize(local.answer).replace(normalize(places.places.find((place) => place.id === qa.placeId)?.name || ""), "PLACE")}`; answers.set(answerKey, (answers.get(answerKey) || 0) + 1)
		}
	}
	const sample = massive.qas.filter((_, index) => index % 25 === 0).map((qa) => qa.localizations.en.question)
	for (let i = 0; i < sample.length; i++) for (let j = i + 1; j < sample.length; j++) if (similarity(sample[i], sample[j]) > 0.92) errors.push(`near duplicate sample: ${sample[i]} <> ${sample[j]}`)
	const report = { generatedAt: new Date().toISOString(), canonicalQA: massive.qas.length, localizedQA: localized, questionVariants: variants, localPlaces: places.places.length, duplicateIds: errors.filter((error) => error.includes("duplicate")).length, validationErrors: errors.length, errors: errors.slice(0, 100) }
	await writeFile(path.join(root, "knowledge/massive-quality-report.json"), `${JSON.stringify(report, null, 2)}\n`)
	if (massive.qas.length < 5000 || localized < 25000 || variants < 75000 || places.places.length < 500 || errors.length) throw new Error(`Knowledge validation failed: ${JSON.stringify(report)}`)
	console.log(JSON.stringify(report))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
