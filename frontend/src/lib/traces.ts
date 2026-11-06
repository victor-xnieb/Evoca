import { api, type Paginated } from "./api"
import type { Option } from "./sensory"
import type { Trace } from "./types"

/** Tipos sensoriales y emociones válidos, con sus etiquetas (GET /traces/catalog/). */
export interface TraceCatalog {
  sensory_types: Option[]
  emotions: Option[]
}

export interface NewTrace {
  sensory_type: string
  note: string
  emotion: string
  mood_intensity: number
}

export interface TraceFilters {
  sensory_type?: string | null
  emotion?: string | null
}

export type TraceChanges = Partial<Pick<Trace, "note" | "emotion" | "mood_intensity">>

export const tracesApi = {
  catalog: () => api.get<TraceCatalog>("traces/catalog/"),
  /** Primera página, de la más reciente a la más antigua (20 por página). */
  recent: () => api.get<Paginated<Trace>>("traces/"),
  /** Mis huellas filtradas por tipo y/o emoción, de la más reciente a la más antigua. */
  list: (filters: TraceFilters = {}, page = 1) =>
    api.get<Paginated<Trace>>("traces/", {
      query: { sensory_type: filters.sensory_type, emotion: filters.emotion, page: page > 1 ? page : undefined },
    }),
  get: (id: string) => api.get<Trace>(`traces/${id}/`),
  create: (trace: NewTrace) => api.post<Trace>("traces/", trace),
  update: (id: string, changes: TraceChanges) => api.patch<Trace>(`traces/${id}/`, changes),
  remove: (id: string) => api.delete(`traces/${id}/`),
}

export function labelOf(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}
