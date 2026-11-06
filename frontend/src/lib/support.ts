import type { HelpLine } from "@/components/evoca/SupportCard"

import { api } from "./api"

/**
 * Orientación hacia ayuda profesional (HU6). Los textos, las líneas y las palabras de riesgo
 * vienen del servidor (los aprueba el psicólogo asesor), no del código de la app.
 */
export interface SupportContent {
  version: number
  /** Aún no aprobado por el psicólogo asesor: se muestra con la marca de provisional. */
  draft: boolean
  orientation_title: string
  orientation_message: string
  help_title: string
  help_message: string
  help_lines: HelpLine[]
  risk_terms: string[]
  updated_at: string
}

export interface OrientationStatus {
  show: boolean
  reason: "low_mood" | "not_enough_low_days" | "recently_answered"
  low_days: number
  window_days: number
  low_days_needed: number
}

export type SupportEventKind =
  | "orientation_shown"
  | "orientation_dismissed"
  | "help_opened"
  | "help_line_opened"
  | "risk_screen_shown"

export const supportApi = {
  content: () => api.get<SupportContent>("support/content/"),
  orientation: () => api.get<OrientationStatus>("support/orientation/"),
  /** Solo se envía el tipo de evento: nunca la nota ni la palabra que activó la ayuda. */
  event: (kind: SupportEventKind) => api.post("support/events/", { kind }),
}

/** Registra un evento sin bloquear ni interrumpir a la persona si falla la red. */
export function logSupportEvent(kind: SupportEventKind) {
  void supportApi.event(kind).catch(() => {})
}

/** Minúsculas, sin tildes y con cualquier signo convertido en espacio. */
export function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

/**
 * Palabras o frases de riesgo que aparecen completas en el texto (sin importar mayúsculas,
 * tildes ni signos). «Matarme» no coincide dentro de otra palabra.
 */
export function findRiskTerms(text: string, terms: string[]) {
  const haystack = ` ${normalizeText(text)} `
  if (haystack.trim() === "") return []
  return terms.filter((term) => {
    const needle = normalizeText(term)
    return needle !== "" && haystack.includes(` ${needle} `)
  })
}
