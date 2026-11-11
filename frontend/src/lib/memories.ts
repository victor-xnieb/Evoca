import { api } from "./api"
import type { Trace } from "./types"

/** Un recuerdo como esfera del mapa (GET /memories/). */
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

export interface MemoryMap {
  /** Recuerdos sin filtros: distingue «aún no tienes recuerdos» de «ninguno coincide». */
  total: number
  count: number
  results: MemorySphere[]
}

/** Un recuerdo con sus huellas, de la más reciente a la más antigua (GET /memories/:id/). */
export interface MemoryDetail extends MemorySphere {
  status: "suggested" | "accepted"
  traces: Trace[]
}

export interface MemoryFilters {
  sensory_type?: string | null
  emotion?: string | null
}

export const memoriesApi = {
  map: (filters: MemoryFilters = {}) =>
    api.get<MemoryMap>("memories/", { query: { sensory_type: filters.sensory_type, emotion: filters.emotion } }),
  get: (id: string) => api.get<MemoryDetail>(`memories/${id}/`),
}

/** Diámetro de la esfera (px) según sus huellas: crece rápido al principio y luego se modera. */
export function sphereDiameter(traceCount: number) {
  return Math.round(Math.min(150, 56 + 22 * Math.sqrt(Math.max(0, traceCount - 1))))
}

/** Número estable a partir de un texto (FNV-1a): la misma esfera cae siempre en el mismo lugar. */
function hash(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export interface PlacedSphere {
  sphere: MemorySphere
  diameter: number
  /** Desplazamiento orgánico (px) para que el mapa no parezca una cuadrícula. */
  dx: number
  dy: number
}

/**
 * Orden del mapa: ni cronológico ni alfabético. Se mezclan grandes y pequeñas de forma
 * estable (según el id), y cada esfera se desplaza un poco para dar un aspecto orgánico.
 */
export function arrangeSpheres(spheres: MemorySphere[]): PlacedSphere[] {
  return spheres
    .map((sphere) => ({ sphere, key: hash(sphere.id) }))
    .sort((a, b) => a.key - b.key)
    .map(({ sphere, key }) => ({
      sphere,
      diameter: sphereDiameter(sphere.trace_count),
      dx: ((key % 17) - 8) * 1.5,
      dy: (((key >>> 5) % 25) - 12) * 1.5,
    }))
}
