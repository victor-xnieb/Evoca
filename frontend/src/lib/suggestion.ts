import { api } from "./api"

/** Emoción e intensidad que propone la IA a partir de la nota (HU8). Nunca se guarda sola. */
export interface EmotionSuggestion {
  emotion: string
  intensity: number
  confidence: number
}

export interface SuggestionResponse {
  suggestion: EmotionSuggestion | null
  reason: "ok" | "too_short" | "unavailable" | "low_confidence"
  min_words: number
}

/** HU8 · Escenario 1: se sugiere a partir de 10 palabras. */
export const SUGGEST_MIN_WORDS = 10

/** «Termino de escribirla»: una pausa corta sin escribir. */
export const SUGGEST_PAUSE_MS = 600

/**
 * Espera máxima de la respuesta. Con la pausa, la sugerencia aparece en menos de 3 s desde la
 * última letra; si tarda más, se sigue sin ella (escenario 3).
 */
export const SUGGEST_TIMEOUT_MS = 2300

export const suggestionApi = {
  suggest: (note: string, signal?: AbortSignal) =>
    api.post<SuggestionResponse>("traces/suggest/", { note }, { signal }),
}

/** Palabras de la nota, con el mismo criterio del servidor (letras, números y guion bajo). */
export function countWords(text: string) {
  return text.match(/[\p{L}\p{N}_]+/gu)?.length ?? 0
}
