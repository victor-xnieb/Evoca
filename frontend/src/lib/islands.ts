import { api } from "./api"

/** Un recuerdo dentro de una isla. */
export interface IslandMemory {
  id: string
  name: string
  emotion: string
  trace_count: number
}

/** Isla (HU15): un gran tema que agrupa recuerdos, propuesto por la IA. */
export interface Island {
  id: string
  /** El nombre que puso la persona o, si no lo cambió, el de la IA. */
  name: string
  ai_name: string
  renamed: boolean
  /** Por qué se agruparon sus recuerdos. */
  explanation: string
  hidden: boolean
  /** Porcentaje de huellas que reúne entre las islas visibles (null si está oculta). */
  weight: number | null
  trace_count: number
  memories: IslandMemory[]
}

/**
 * - "too_few": menos de 15 recuerdos en el mapa (`missing` dice cuántos faltan).
 * - "pending": aún no se calculan (la app lo pide).
 * - "unavailable": la IA no pudo ahora.
 * - "ready": con sus islas.
 */
export type IslandsStatus = "too_few" | "pending" | "unavailable" | "ready"

/** GET /islands/ (HU15). */
export interface IslandsData {
  status: IslandsStatus
  memory_count: number
  required: number
  missing: number
  /** Los recuerdos cambiaron desde el último cálculo: conviene volver a calcular. */
  outdated: boolean
  calculated_at: string | null
  /** Visibles, de la que más pesa a la que menos. */
  islands: Island[]
  hidden: Island[]
}

export const islandsApi = {
  get: () => api.get<IslandsData>("islands/"),
  /** La IA (en el servidor) calcula o vuelve a calcular las islas; los cambios de la persona se conservan. */
  calculate: () => api.post<IslandsData>("islands/calculate/"),
  /** Renombrar (vacío vuelve al nombre de la IA) u ocultar / mostrar una isla. */
  update: (id: string, changes: { name?: string; hidden?: boolean }) => api.patch<IslandsData>(`islands/${id}/`, changes),
}
