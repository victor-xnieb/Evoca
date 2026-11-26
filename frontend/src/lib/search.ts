import { api } from "./api"
import type { Trace } from "./types"

/** Qué tan parecida es una huella a la frase buscada. */
export type SimilarityLevel = "high" | "medium" | "low"

/** "meaning": por significado (IA). "words": respaldo por palabras cuando la IA no está. */
export type SearchMode = "meaning" | "words"

export interface SearchResult {
  similarity: number
  level: SimilarityLevel
  trace: Trace
}

/** Resultado de POST /traces/search/ (HU12). */
export interface SearchResponse {
  query: string
  /** HU6: la frase tiene palabras de riesgo; no se buscó ni se envió a la IA. */
  risk: boolean
  mode: SearchMode
  /** Huellas que la IA aún no ha preparado y no entraron en esta búsqueda. */
  pending: number
  count: number
  results: SearchResult[]
}

export const SEARCH_MIN_LENGTH = 3
export const SEARCH_MAX_LENGTH = 200

/** La primera búsqueda prepara huellas con la IA: puede tardar algunos segundos. */
export const SEARCH_TIMEOUT_MS = 20_000

export const searchApi = {
  // La frase va en el cuerpo y no en la URL: así no queda en los registros del servidor.
  search: (query: string, signal?: AbortSignal) => api.post<SearchResponse>("traces/search/", { query }, { signal }),
}

const LABELS: Record<SearchMode, Record<SimilarityLevel, string>> = {
  meaning: { high: "Muy parecida", medium: "Parecida", low: "Algo parecida" },
  words: { high: "Tiene todas las palabras", medium: "Tiene varias palabras", low: "Tiene alguna palabra" },
}

export function similarityLabel(level: SimilarityLevel, mode: SearchMode) {
  return LABELS[mode][level]
}
