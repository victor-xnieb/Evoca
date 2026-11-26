import { api } from "./api"
import { formatAverage } from "./format"

/** "month": últimos 30 días; "all": todas las huellas. */
export type StatsPeriod = "month" | "all"

/** Un elemento que la persona registra (lo reconoce la IA en la nota): «café», «salsa», «parque». */
export interface SensationElement {
  name: string
  type: string
  count: number
  /** Ánimo promedio (1 a 5) de esas huellas: emoción + intensidad, como en HU4 y HU6. */
  average_mood: number | null
}

export interface SensationType {
  type: string
  label: string
  count: number
  average_mood: number | null
  top_elements: SensationElement[]
}

/** GET /traces/stats/ (HU13). */
export interface SensationStats {
  period: StatsPeriod
  /** Huellas en total (para saber si ya hay estadísticas). */
  total: number
  required: number
  /** Cuántas huellas faltan para ver las estadísticas (escenario 3). */
  missing: number
  ready: boolean
  /** Huellas del periodo. */
  count: number
  average_mood: number | null
  /** Los seis tipos, de más a menos huellas. */
  types: SensationType[]
  /** Los 5 elementos más frecuentes del periodo. */
  top_elements: SensationElement[]
  /** Huellas del periodo cuyo elemento aún no reconoce la IA. */
  pending: number
}

export interface ElementsExtraction {
  status: "ok" | "unavailable"
  extracted: number
  pending: number
}

export const countLabel = (count: number) => `${count} ${count === 1 ? "huella" : "huellas"}`

/** HU13 · Escenario 2: el ánimo de un tipo comparado con el general, como observación y no diagnóstico. */
export function observation(type: SensationType, overall: number | null) {
  if (type.average_mood === null) return `Aún no registras huellas de ${type.label.toLowerCase()} en este periodo.`
  let comparison = ""
  if (overall !== null) {
    const diff = type.average_mood - overall
    const relation =
      Math.abs(diff) < 0.3
        ? "parecido a tu promedio general"
        : diff > 0
          ? "un poco más alto que tu promedio general"
          : "un poco más bajo que tu promedio general"
    comparison = `, ${relation} (${formatAverage(overall)})`
  }
  return `En tus huellas de ${type.label.toLowerCase()}, tu ánimo promedio fue ${formatAverage(type.average_mood)} de 5${comparison}. Es una observación de tus registros, no un diagnóstico.`
}

export const statsApi = {
  get: (period: StatsPeriod) => api.get<SensationStats>("traces/stats/", { query: { period } }),
  /** Pide a la IA (en el servidor) que reconozca los elementos que faltan, unos 80 por vez. */
  extract: () => api.post<ElementsExtraction>("traces/stats/elements/"),
}
