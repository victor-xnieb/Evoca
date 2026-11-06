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
  /** Día AAAA-MM-DD (hora de Bogotá). */
  date?: string | null
}

/** Calendario de un mes: por día con huellas, su emoción dominante (GET /traces/calendar/). */
export interface CalendarData {
  month: string
  /** Primer mes con datos o en que se creó la cuenta: no se navega más atrás. */
  first_month: string
  days: Array<{ date: string; dominant_emotion: string; average_intensity: number; count: number }>
}

export type MoodPeriod = "week" | "month"

/** Datos de la gráfica de ánimo: un punto por huella real del periodo (GET /traces/mood/). */
export interface MoodData {
  period: MoodPeriod
  start: string
  end: string
  count: number
  average: number | null
  points: Array<{ id: string; date: string; intensity: number; emotion: string }>
}

export type TraceChanges = Partial<Pick<Trace, "note" | "emotion" | "mood_intensity">>

export const tracesApi = {
  catalog: () => api.get<TraceCatalog>("traces/catalog/"),
  /** Primera página, de la más reciente a la más antigua (20 por página). */
  recent: () => api.get<Paginated<Trace>>("traces/"),
  /** Mis huellas filtradas por tipo y/o emoción, de la más reciente a la más antigua. */
  list: (filters: TraceFilters = {}, page = 1) =>
    api.get<Paginated<Trace>>("traces/", {
      query: {
        sensory_type: filters.sensory_type,
        emotion: filters.emotion,
        date: filters.date,
        page: page > 1 ? page : undefined,
      },
    }),
  calendar: (month: string) => api.get<CalendarData>("traces/calendar/", { query: { month } }),
  mood: (period: MoodPeriod) => api.get<MoodData>("traces/mood/", { query: { period } }),
  get: (id: string) => api.get<Trace>(`traces/${id}/`),
  create: (trace: NewTrace) => api.post<Trace>("traces/", trace),
  update: (id: string, changes: TraceChanges) => api.patch<Trace>(`traces/${id}/`, changes),
  remove: (id: string) => api.delete(`traces/${id}/`),
}

export function labelOf(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}
