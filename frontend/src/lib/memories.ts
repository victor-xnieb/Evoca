import { api } from "./api"
import type { Trace } from "./types"

/** Un recuerdo como esfera del mapa (nodo del grafo de GET /memories/). */
export interface MemorySphere {
  id: string
  name: string
  explanation: string
  /** Emoción dominante de sus huellas: el color de la esfera. */
  emotion: string
  /** Cuántas huellas lo forman: el tamaño de la esfera. */
  trace_count: number
  sensory_types: string[]
}

export interface MemoryNode extends MemorySphere {
  /** Coincide con los filtros (sin filtros, siempre). Los que no, se atenúan. */
  match: boolean
}

/** Conexión entre dos recuerdos afines: puntaje de 0 a 1 y su motivo legible. */
export interface MemoryEdge {
  source: string
  target: string
  score: number
  reason: string
}

export interface MemoryGraph {
  /** Recuerdos dibujados: distingue «aún no tienes recuerdos» de «ninguno coincide». */
  total: number
  /** Los que coinciden con los filtros. */
  count: number
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  /** Máximo de conexiones por recuerdo que usa el servidor. */
  max_links: number
}

export type MemoryStatus = "suggested" | "accepted" | "discarded"

/** Un recuerdo con sus huellas, de la más reciente a la más antigua (GET /memories/:id/). */
export interface MemoryDetail extends MemorySphere {
  status: MemoryStatus
  traces: Trace[]
}

/** Un recuerdo que propuso la IA y la persona aún no revisó (HU9). */
export interface MemorySuggestion extends MemoryDetail {
  suggested_at: string | null
}

/** Las sugerencias pendientes y si vale la pena pedir más (GET /memories/suggestions/). */
export interface SuggestionsSummary {
  suggestions: MemorySuggestion[]
  trace_count: number
  ungrouped_count: number
  /** HU9 · Escenario 1: hay sugerencias a partir de este número de huellas. */
  min_traces: number
  /** Hay huellas suficientes y al menos dos sin recuerdo: la IA puede proponer algo. */
  can_suggest: boolean
}

/** Por qué no hubo sugerencias nuevas (POST /memories/suggest/). */
export type SuggestReason = "ok" | "too_few_traces" | "all_grouped" | "unavailable" | "none"

export interface SuggestResponse extends SuggestionsSummary {
  reason: SuggestReason
}

export interface MemoryFilters {
  sensory_type?: string | null
  emotion?: string | null
}

export const memoriesApi = {
  graph: (filters: MemoryFilters = {}) =>
    api.get<MemoryGraph>("memories/", { query: { sensory_type: filters.sensory_type, emotion: filters.emotion } }),
  get: (id: string) => api.get<MemoryDetail>(`memories/${id}/`),
  /** HU9: las sugerencias de la IA sin revisar. */
  suggestions: () => api.get<SuggestionsSummary>("memories/suggestions/"),
  /** HU9: pide a la IA recuerdos nuevos con las huellas que aún no están en ninguno. */
  suggest: (signal?: AbortSignal) => api.post<SuggestResponse>("memories/suggest/", {}, { signal }),
  accept: (id: string, name?: string) => api.post<MemorySuggestion>(`memories/${id}/accept/`, name ? { name } : {}),
  rename: (id: string, name: string) => api.patch<MemorySuggestion>(`memories/${id}/`, { name }),
  removeTrace: (id: string, traceId: string) => api.delete<MemorySuggestion>(`memories/${id}/traces/${traceId}/`),
  discard: (id: string) => api.post<void>(`memories/${id}/discard/`, {}),
}

/** Espera máxima para que la IA agrupe las huellas: más que una nota, pero no indefinida. */
export const SUGGEST_MEMORIES_TIMEOUT_MS = 20_000

/** Diámetro de la esfera (px) según sus huellas: crece rápido al principio y luego se modera. */
export function sphereDiameter(traceCount: number) {
  return Math.round(Math.min(150, 56 + 22 * Math.sqrt(Math.max(0, traceCount - 1))))
}

/** Afinidad como porcentaje legible («72 %»). */
export function affinityPercent(score: number) {
  return `${Math.round(score * 100)} %`
}

/** Conexiones de un recuerdo, de la más afín a la menos, con el otro extremo. */
export function connectionsOf(id: string, edges: MemoryEdge[]) {
  return edges
    .filter((edge) => edge.source === id || edge.target === id)
    .map((edge) => ({ edge, other: edge.source === id ? edge.target : edge.source }))
    .sort((a, b) => b.edge.score - a.edge.score)
}
