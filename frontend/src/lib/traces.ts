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

export const tracesApi = {
  catalog: () => api.get<TraceCatalog>("traces/catalog/"),
  /** Primera página, de la más reciente a la más antigua (20 por página). */
  recent: () => api.get<Paginated<Trace>>("traces/"),
  create: (trace: NewTrace) => api.post<Trace>("traces/", trace),
}

export function labelOf(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}
