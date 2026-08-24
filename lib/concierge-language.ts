import type { ConciergeLanguage, ConversationTurn } from "@/lib/concierge-types"

const languages: ConciergeLanguage[] = ["en", "it", "es", "fr", "de"]
const clearHints: Record<ConciergeLanguage, RegExp> = {
	en: /\b(what|where|when|which|how|can you|could you|please|breakfast|children|thanks|near|with|for us|recommend|our family)\b/i,
	it: /\b(cosa|dove|quando|quale|come|possiamo|potete|colazione|spiaggia|bambini|grazie|aeroporto|parcheggio|vorrei|vicino|con|consigli|famiglia|c['’]e|quanto)\b/i,
	es: /\b(qué|dónde|donde|cómo|como|podemos|puede|desayuno|playa|niños|ninos|gracias|aeropuerto|aparcamiento|quisiera|cerca|recomiendas|familia|hay)\b/i,
	fr: /\b(quoi|que|où|ou|quand|quel|quelle|comment|pouvons|pouvez|petit déjeuner|plage|enfants|merci|aéroport|aeroport|stationnement|voudrais|près|avec|conseillez|famille|combien)\b/i,
	de: /\b(was|wo|wann|welche|wie|können|konnen|frühstück|fruhstuck|strand|kinder|danke|flughafen|parken|möchte|mochte|nähe|nahe|mit|empfehlen|familie|gibt es)\b/i
}

// Proper names are intentionally ignored. Detection is based on grammatical/function words
// and guest vocabulary, so "Uncle Bill's Pancake House vicino alla spiaggia" remains Italian.
const weightedHints: Record<ConciergeLanguage, string[]> = {
	en: ["what", "where", "which", "should", "near", "with", "breakfast", "parking", "airport", "groceries", "kids"],
	it: ["dove", "quale", "consigli", "vicino", "alla", "con", "colazione", "parcheggio", "aeroporto", "spesa", "bambini", "famiglia"],
	es: ["donde", "cuál", "cual", "recomiendas", "cerca", "con", "desayuno", "aparcamiento", "aeropuerto", "supermercado", "niños", "ninos", "familia"],
	fr: ["où", "ou", "quelle", "conseillez", "près", "avec", "déjeuner", "dejeuner", "stationnement", "aéroport", "aeroport", "supermarché", "enfants", "famille"],
	de: ["wo", "welche", "empfehlen", "nähe", "nahe", "mit", "frühstück", "fruhstuck", "parken", "flughafen", "supermarkt", "kinder", "familie"]
}

export function languageScores(value: string): Record<ConciergeLanguage, number> {
	const normalized = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
	return Object.fromEntries(languages.map((language) => [language, weightedHints[language].reduce((score, hint) => score + (new RegExp(`\\b${hint.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")}\\b`, "i").test(normalized) ? 1 : 0), 0)])) as Record<ConciergeLanguage, number>
}

function explicitLanguage(value: string): ConciergeLanguage | undefined {
	const normalized = value.toLowerCase()
	const requested = languages.find((language) => new RegExp(`\\b(?:answer|respond|reply|scrivi|rispondi|responde|réponds|antworte)\\s+(?:in|en|auf)?\\s*${language === "en" ? "english|inglese|inglés|anglais|englisch" : language === "it" ? "italian|italiano|italien|italienisch" : language === "es" ? "spanish|spagnolo|español|espagnol|spanisch" : language === "fr" ? "french|francese|francés|français|französisch" : "german|tedesco|alemán|allemand|deutsch"}\\b`, "i").test(normalized))
	return requested
}

export function detectLanguage(question: string, history: ConversationTurn[] = []): ConciergeLanguage {
	const explicit = explicitLanguage(question)
	if (explicit) return explicit
	const scores = languageScores(question)
	const ranked = languages.map((language) => ({ language, score: scores[language] })).sort((a, b) => b.score - a.score)
	if (ranked[0].score > ranked[1].score && ranked[0].score >= 2) return ranked[0].language
	const currentMatches = languages.filter((language) => clearHints[language].test(question))
	if (currentMatches.length === 1) return currentMatches[0]
	for (const turn of [...history].reverse()) {
		const requested = explicitLanguage(turn.content)
		if (requested) return requested
		const matches = languages.filter((language) => clearHints[language].test(turn.content))
		if (matches.length === 1) return matches[0]
	}
	return "en"
}

const text = {
	lead: { en: "Here’s the most useful verified guidance:", it: "Ecco le informazioni verificate più utili:", es: "Esta es la información verificada más útil:", fr: "Voici les informations vérifiées les plus utiles :", de: "Hier sind die hilfreichsten geprüften Informationen:" },
	unknown: { en: "I don't have a verified answer for that yet. The host can confirm it.", it: "Non ho ancora una risposta verificata. L’host può confermarla.", es: "Todavía no tengo una respuesta verificada. El anfitrión puede confirmarla.", fr: "Je n’ai pas encore de réponse vérifiée. L’hôte peut la confirmer.", de: "Dazu habe ich noch keine verifizierte Antwort. Der Gastgeber kann es bestätigen." },
	verified: { en: "Verified guidance", it: "Indicazione verificata", es: "Información verificada", fr: "Information vérifiée", de: "Geprüfte Empfehlung" },
	options: { en: "Other useful verified options", it: "Altre opzioni verificate utili", es: "Otras opciones verificadas útiles", fr: "Autres options vérifiées utiles", de: "Weitere hilfreiche geprüfte Optionen" },
	live: { en: "Hours, traffic, weather, prices and availability can change in real time. Check the current information directly before relying on it.", it: "Orari, traffico, meteo, prezzi e disponibilità possono cambiare in tempo reale. Verificate direttamente le informazioni aggiornate prima di fare affidamento su di esse.", es: "Los horarios, el tráfico, el tiempo, los precios y la disponibilidad pueden cambiar en tiempo real. Comprueben directamente la información actual antes de utilizarla.", fr: "Les horaires, la circulation, la météo, les prix et les disponibilités peuvent changer en temps réel. Vérifiez directement les informations actuelles avant de vous y fier.", de: "Öffnungszeiten, Verkehr, Wetter, Preise und Verfügbarkeit können sich jederzeit ändern. Prüfen Sie die aktuellen Angaben direkt, bevor Sie sich darauf verlassen." },
	booking: { en: "Request Availability is only an inquiry and does not create a reservation. Availability, terms and acceptance are confirmed manually by the host.", it: "La richiesta di disponibilità è solo una domanda e non crea una prenotazione. Disponibilità, condizioni e accettazione sono confermate manualmente dall’host.", es: "La solicitud de disponibilidad es solo una consulta y no crea una reserva. El anfitrión confirma manualmente la disponibilidad, las condiciones y la aceptación.", fr: "La demande de disponibilité est une simple prise de contact et ne crée pas de réservation. L’hôte confirme manuellement la disponibilité, les conditions et l’acceptation.", de: "Eine Verfügbarkeitsanfrage ist nur eine Anfrage und erstellt keine Buchung. Verfügbarkeit, Bedingungen und Annahme werden vom Gastgeber manuell bestätigt." },
	emergency: { en: "For an immediate threat to life or property in the United States, call 911. The concierge cannot dispatch emergency help.", it: "In caso di pericolo immediato per persone o cose negli Stati Uniti, chiamate il 911. Il concierge non può inviare soccorsi.", es: "Ante un peligro inmediato para personas o bienes en Estados Unidos, llame al 911. El conserje no puede enviar ayuda de emergencia.", fr: "En cas de danger immédiat pour une personne ou un bien aux États-Unis, appelez le 911. Le concierge ne peut pas envoyer les secours.", de: "Bei unmittelbarer Gefahr für Leben oder Eigentum in den USA wählen Sie 911. Der Concierge kann keine Notfallhilfe entsenden." }
} satisfies Record<string, Record<ConciergeLanguage, string>>

export const languageLead = (language: ConciergeLanguage) => text.lead[language]
export const languageUnknown = (language: ConciergeLanguage) => text.unknown[language]
export const languageVerifiedLabel = (language: ConciergeLanguage) => text.verified[language]
export const languageOptionsLabel = (language: ConciergeLanguage) => text.options[language]
export const languageLiveFallback = (language: ConciergeLanguage) => text.live[language]
export const languageBookingFallback = (language: ConciergeLanguage) => text.booking[language]
export const languageEmergencyFallback = (language: ConciergeLanguage) => text.emergency[language]
