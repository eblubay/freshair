export type ConciergeScope = "PUBLIC_SAFE" | "GUEST_ONLY" | "OWNER_ONLY"
export type ConciergeRecord = { id: string; category: string; title: string; content: string; tags: string[]; location: string; scope: ConciergeScope; confidence: number; freshness: string; source: string; sourcePath: string; poi?: { id: string; lat: number; lng: number; href: string } }
export type ConversationTurn = { role: "user" | "assistant"; content: string }
export type ConciergeMetadata = { answerType: "retrieval" | "itinerary" | "booking-safe" | "live-safe" | "emergency" | "security" | "unknown" | "provider"; confidence: number; knowledgeIds: string[]; sourceIds: string[]; freshness: string[]; liveDataNeeded: boolean; language: string; provider: "deterministic" | "openai" | "ollama" }
export type ConciergeAnswer = { answer: string; metadata: ConciergeMetadata; links?: { id: string; label: string; href: string }[] }
