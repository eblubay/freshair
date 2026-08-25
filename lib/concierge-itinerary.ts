import type { ConciergeLanguage } from "@/lib/concierge-types"
import type { PlaceIntent, PlaceSearchResult } from "@/lib/local-place-search"

type ItineraryDuration = "half-day" | "full-day" | "afternoon" | "evening" | "multi-day"

const durationPatterns: Array<[ItineraryDuration, RegExp]> = [
	["multi-day", /\b(?:2|3|two|three|due|tre|dos|tres|deux|trois|zwei|drei)\s+(?:days?|giorni|d[ií]as|jours?|tage?)\b/i],
	["half-day", /\b(?:half[ -]?day|mezza giornata|medio d[ií]a|demi-journ[eé]e|halber tag)\b/i],
	["afternoon", /\b(?:afternoon|pomeriggio|tarde|apr[eè]s-midi|nachmittag)\b/i],
	["evening", /\b(?:evening|sera|soir[eé]e|abend)\b/i],
	["full-day", /\b(?:full[ -]?day|one[ -]?day|day|giornata|un giorno|d[ií]a|journ[eé]e|tag|tagesausflug)\b/i]
]

const copy: Record<ConciergeLanguage, {
	title: string
	area: string
	audience: Partial<Record<NonNullable<PlaceIntent["audience"]>, string>>
	duration: Record<ItineraryDuration, string>
	step: (index: number) => string
	guidance: string
	notes: string
}> = {
	en: { title: "Suggested itinerary", area: "Area", audience: { couples: "couple", family: "family", teenagers: "teenagers" }, duration: { "half-day": "half day", "full-day": "one day", afternoon: "afternoon", evening: "evening", "multi-day": "multiple days" }, step: (index) => `Step ${index}`, guidance: "Verified plan", notes: "Practical notes" },
	it: { title: "Programma consigliato", area: "Zona", audience: { couples: "coppia", family: "famiglia", teenagers: "ragazzi" }, duration: { "half-day": "mezza giornata", "full-day": "una giornata", afternoon: "pomeriggio", evening: "sera", "multi-day": "più giorni" }, step: (index) => `Tappa ${index}`, guidance: "Piano verificato", notes: "Note pratiche" },
	es: { title: "Itinerario sugerido", area: "Zona", audience: { couples: "pareja", family: "familia", teenagers: "adolescentes" }, duration: { "half-day": "medio día", "full-day": "un día", afternoon: "tarde", evening: "noche", "multi-day": "varios días" }, step: (index) => `Etapa ${index}`, guidance: "Plan verificado", notes: "Notas prácticas" },
	fr: { title: "Itinéraire conseillé", area: "Zone", audience: { couples: "couple", family: "famille", teenagers: "adolescents" }, duration: { "half-day": "demi-journée", "full-day": "une journée", afternoon: "après-midi", evening: "soirée", "multi-day": "plusieurs jours" }, step: (index) => `Étape ${index}`, guidance: "Programme vérifié", notes: "Notes pratiques" },
	de: { title: "Empfohlener Reiseplan", area: "Gebiet", audience: { couples: "Paar", family: "Familie", teenagers: "Jugendliche" }, duration: { "half-day": "halber Tag", "full-day": "ein Tag", afternoon: "Nachmittag", evening: "Abend", "multi-day": "mehrere Tage" }, step: (index) => `Etappe ${index}`, guidance: "Geprüfter Plan", notes: "Praktische Hinweise" }
}

export function detectItineraryDuration(question: string): ItineraryDuration | undefined {
	return durationPatterns.find(([, pattern]) => pattern.test(question))?.[0]
}

function sentences(value: string) {
	return value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? []
}

function groundedAreas(question: string, groundedText: string) {
	const candidates = (question.match(/\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*)*/gu) ?? []).map((candidate) => candidate.replace(/[.,;:!?]+$/u, ""))
	const grounded = groundedText.toLocaleLowerCase()
	return [...new Set(candidates.filter((candidate) => grounded.includes(candidate.toLocaleLowerCase())))]
}

const practicalNote = /\b(?:traffic|parking|hours?|routing|conditions?|reservations?|check|verify|traffico|parcheggio|orari|navigazione|condizioni|prenotazioni|controlla|verifica|tr[aá]fico|estacionamiento|horarios?|reservas?|compruebe|circulation|stationnement|horaires?|r[eé]servations?|v[eé]rifiez|verkehr|parken|öffnungszeiten|reservierungen|überprüfen)\b/i

export function renderItinerary(question: string, language: ConciergeLanguage, intent: PlaceIntent, groundedAnswers: string[], placeResults: PlaceSearchResult[] = []) {
	const localized = copy[language]
	const duration = detectItineraryDuration(question)
	const groundedText = groundedAnswers.join(" ")
	const areas = groundedAreas(question, groundedText)
	const areaContext = areas.length >= 2 ? areas.join(" + ") : intent.area ? `${localized.area}: ${intent.area}` : undefined
	const context = [
		areaContext,
		intent.audience ? localized.audience[intent.audience] : undefined,
		duration ? localized.duration[duration] : undefined
	].filter(Boolean)
	const groundedStops = placeResults
		.filter(({ place }) => place.curated && groundedText.toLocaleLowerCase().includes(place.name.toLocaleLowerCase()))
		.sort((a, b) => groundedText.toLocaleLowerCase().indexOf(a.place.name.toLocaleLowerCase()) - groundedText.toLocaleLowerCase().indexOf(b.place.name.toLocaleLowerCase()))
		.map(({ place }) => place.name)
	const groundedSentences = groundedAnswers.flatMap(sentences)
	const notes = groundedSentences.filter((sentence) => practicalNote.test(sentence))
	const plan = groundedSentences.filter((sentence) => !practicalNote.test(sentence))
	const heading = `**${localized.title}${context.length ? ` — ${context.join(" · ")}` : ""}**`
	const stepContent = groundedStops.length >= 2 ? groundedStops : plan
	const steps = stepContent.map((step, index) => `${index + 1}. **${localized.step(index + 1)}**\n${step}`).join("\n\n")
	const groundedPlan = groundedStops.length >= 2 && plan.length ? `\n\n**${localized.guidance}**\n${plan.join(" ")}` : ""
	const practical = notes.length ? `\n\n**${localized.notes}**\n${notes.join(" ")}` : ""
	return `${heading}\n\n${steps}${groundedPlan}${practical}`
}
