export type ConciergeScope = "PUBLIC_SAFE" | "GUEST_ONLY" | "OWNER_ONLY"
export type ConciergeLanguage = "en" | "it" | "es" | "fr" | "de"
export type ConciergeRecord = { id: string; category: string; title: string; content: string; tags: string[]; location: string; scope: ConciergeScope; confidence: number; freshness: string; source: string; sourcePath: string; parentId?: string; facet?: string; poi?: { id: string; lat: number; lng: number; href: string } }
export type GuestQALocalization = { question: string; answer: string; alternativeQuestions: string[] }
export type CanonicalGuestQA = { id: string; category: string; localizations: Record<ConciergeLanguage, GuestQALocalization>; tags: string[]; locations: string[]; sourceIds: string[]; publicSafe: boolean; liveDataDependent: boolean; knowledgeIds: string[] }
export type ConversationTurn = { role: "user" | "assistant"; content: string }
export type ConciergeMetadata = { answerType: "canonical-qa" | "retrieval" | "itinerary" | "booking-safe" | "live-safe" | "emergency" | "security" | "unknown" | "provider"; confidence: number; knowledgeIds: string[]; qaIds: string[]; primaryIntent?: string; sourceIds: string[]; freshness: string[]; liveDataNeeded: boolean; language: string; provider: "deterministic" | "openai" | "ollama" }
export type ConciergeAnswer = { answer: string; metadata: ConciergeMetadata; links?: { id: string; label: string; href: string }[] }
