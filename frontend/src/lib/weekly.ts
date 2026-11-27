import { api, apiRequest } from "./api"
import { formatDate } from "./format"

/**
 * - "disabled": la persona desactivó el resumen (no se muestra).
 * - "too_few": menos de 5 huellas la semana pasada.
 * - "pending": aún no está preparado (la app pide prepararlo).
 * - "unavailable": la IA no pudo prepararlo ahora.
 * - "ready": con sus patrones.
 */
export type WeeklyStatus = "disabled" | "too_few" | "pending" | "unavailable" | "ready"

/** Una huella con la que se calculó un patrón. */
export interface PatternTrace {
  id: string
  date: string
  sensory_type: string
  emotion: string
  mood_intensity: number
  /** Ánimo de 1 a 5 (emoción + intensidad), como en HU4 y HU6. */
  mood: number
  note: string
}

export interface WeeklyPattern {
  text: string
  /** Con cuántas huellas se calculó (aunque luego se haya borrado alguna). */
  trace_count: number
  traces: PatternTrace[]
}

/** GET /weekly-summary/ (HU14): el resumen de la semana pasada, de lunes a domingo. */
export interface WeeklySummary {
  enabled: boolean
  status: WeeklyStatus
  /** AAAA-MM-DD, lunes y domingo de la semana resumida. */
  week_start: string
  week_end: string
  /** Huellas de esa semana. */
  count: number
  required: number
  /** Cuántas faltaron para llegar a 5. */
  missing: number
  patterns: WeeklyPattern[]
}

export const weeklyApi = {
  get: () => api.get<WeeklySummary>("weekly-summary/"),
  /** Prepara el resumen con la IA (en el servidor) si aún no existe. */
  generate: () => api.post<WeeklySummary>("weekly-summary/generate/"),
  settings: () => api.get<{ enabled: boolean }>("weekly-summary/settings/"),
  saveSettings: (enabled: boolean) => apiRequest<{ enabled: boolean }>("weekly-summary/settings/", { method: "PUT", body: { enabled } }),
}

/** «2026-11-16» como fecha local (no UTC: en Bogotá sería el día anterior). */
export function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** «16 al 22 de noviembre» o «28 de noviembre al 4 de diciembre». */
export function weekRange(start: string, end: string) {
  const from = localDate(start)
  const to = localDate(end)
  const first = from.getMonth() === to.getMonth() ? String(from.getDate()) : formatDate(from)
  return `${first} al ${formatDate(to)}`
}
