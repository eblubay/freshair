const hints: Record<string, RegExp> = {
	it: /\b(cosa|dove|come|possiamo|spiaggia|ristorante|bambini|grazie|aeroporto|parcheggio)\b/i,
	fr: /\b(quoi|que|ou|comment|pouvons|plage|restaurant|enfants|merci|aeroport|parking)\b/i,
	es: /\b(que|donde|como|podemos|playa|restaurante|ninos|gracias|aeropuerto|aparcamiento)\b/i,
	de: /\b(was|wo|wie|konnen|strand|restaurant|kinder|danke|flughafen|parken)\b/i
}
export function detectLanguage(question: string) {
	if (/\b(pouvons|plage|enfants|merci|aeroport)\b/i.test(question)) return "fr"
	if (/\b(podemos|playa|ninos|gracias|aeropuerto|aparcamiento)\b/i.test(question)) return "es"
	return Object.entries(hints).find(([, pattern]) => pattern.test(question))?.[0] ?? "en"
}
const lead: Record<string, string> = { en: "Here’s the most useful verified guidance:", it: "Ecco le informazioni verificate più utili:", es: "Esta es la información verificada más útil:", fr: "Voici les informations vérifiées les plus utiles :", de: "Hier sind die hilfreichsten geprüften Informationen:" }
const unknown: Record<string, string> = { en: "I don't have a verified answer for that yet. The host can confirm it.", it: "Non ho ancora una risposta verificata. L’host può confermarla.", es: "Todavía no tengo una respuesta verificada. El anfitrión puede confirmarla.", fr: "Je n’ai pas encore de réponse vérifiée. L’hôte peut la confirmer.", de: "Dazu habe ich noch keine verifizierte Antwort. Der Gastgeber kann es bestätigen." }
export function languageLead(language: string) { return lead[language] ?? lead.en }
export function languageUnknown(language: string) { return unknown[language] ?? unknown.en }
const verifiedLabel: Record<string, string> = { en: "Verified guidance", it: "Indicazione verificata", es: "Información verificada", fr: "Information vérifiée", de: "Geprüfte Empfehlung" }
const optionsLabel: Record<string, string> = { en: "Other useful verified options", it: "Altre opzioni verificate utili", es: "Otras opciones verificadas útiles", fr: "Autres options vérifiées utiles", de: "Weitere hilfreiche geprüfte Optionen" }
const live: Record<string, string> = {
	en: "Hours, traffic, weather, prices and availability can change in real time. Check the current information directly before relying on it.",
	it: "Orari, traffico, meteo, prezzi e disponibilità possono cambiare in tempo reale. Verificate direttamente le informazioni aggiornate prima di fare affidamento su di esse.",
	es: "Los horarios, el tráfico, el tiempo, los precios y la disponibilidad pueden cambiar en tiempo real. Comprueben directamente la información actual antes de utilizarla.",
	fr: "Les horaires, la circulation, la météo, les prix et les disponibilités peuvent changer en temps réel. Vérifiez directement les informations actuelles avant de vous y fier.",
	de: "Öffnungszeiten, Verkehr, Wetter, Preise und Verfügbarkeit können sich jederzeit ändern. Prüfen Sie die aktuellen Angaben direkt, bevor Sie sich darauf verlassen."
}
export function languageVerifiedLabel(language: string) { return verifiedLabel[language] ?? verifiedLabel.en }
export function languageOptionsLabel(language: string) { return optionsLabel[language] ?? optionsLabel.en }
export function languageLiveFallback(language: string) { return live[language] ?? live.en }
