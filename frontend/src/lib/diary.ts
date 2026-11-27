import type { JSONContent } from "@tiptap/react"

import { api } from "./api"

export type Paper = "lined" | "grid" | "dots" | "blank"
export type Cover = "terracota" | "oliva" | "azul" | "ciruela" | "mostaza" | "arena"
export type DiaryFont = "caveat" | "patrick" | "kalam" | "indie"
export type Ink = "sepia" | "azul" | "verde" | "vino" | "morado"

/** Un cuaderno de la estantería (HU17). */
export interface Notebook {
  id: string
  title: string
  cover: Cover
  paper: Paper
  page_count: number
  created_at: string
  updated_at: string
}

/** HU18: una huella que la IA sacó de la página, con la frase de donde salió. */
export interface EvokedTrace {
  index: number
  sensory_type: string
  note: string
  emotion: string
  intensity: number
  /** Palabras exactas de la página (vacío si la IA no las encontró tal cual). */
  quote: string
}

export type SuggestionStatus = "suggested" | "accepted" | "discarded"

/** HU18: un recuerdo sugerido desde la página. */
export interface EvokedMemory {
  index: number
  name: string
  explanation: string
  status: SuggestionStatus
  /** Al aceptarlo, el recuerdo del mapa. */
  memory_id: string | null
  traces: EvokedTrace[]
}

/** Frase que se ilumina en la página; si el recuerdo se aceptó, lleva a él. */
export interface Highlight {
  quote: string
  emotion: string
  memory_id: string | null
}

export interface Evocation {
  memories: EvokedMemory[]
  highlights: Highlight[]
}

/** «ok», o por qué no hubo sugerencias. */
export type EvokeStatus = "ok" | "too_short" | "risk" | "unavailable"

/** Una página: lo escrito es un documento del editor; `text` es su texto plano. */
export interface DiaryPage {
  id: string
  notebook: string
  /** AAAA-MM-DD */
  day: string
  /** Vacío = el papel del cuaderno. */
  paper: Paper | ""
  font: DiaryFont
  ink: Ink
  content: JSONContent
  text: string
  /** Emoción dominante de las huellas de ese día (o null): tiñe el marcador de la página. */
  day_emotion: string | null
  /** HU18: recuerdos sugeridos desde esta página y frases que se iluminan. */
  evocation?: Evocation
  /** HU19: la carta a la que responde esta página. */
  reply_to?: { id: string; written: string } | null
  created_at: string
  updated_at: string
}

export type NotebookFields = Pick<Notebook, "title" | "cover" | "paper">
export type PageChanges = Partial<Pick<DiaryPage, "content" | "paper" | "font" | "ink" | "day">>

export const PAPERS: Array<{ value: Paper; label: string }> = [
  { value: "lined", label: "Rayado" },
  { value: "grid", label: "Cuadriculado" },
  { value: "dots", label: "De puntos" },
  { value: "blank", label: "Liso" },
]

export const COVERS: Array<{ value: Cover; label: string; color: string }> = [
  { value: "terracota", label: "Terracota", color: "#b8643f" },
  { value: "oliva", label: "Oliva", color: "#6f7a45" },
  { value: "azul", label: "Azul noche", color: "#33507a" },
  { value: "ciruela", label: "Ciruela", color: "#7a3d63" },
  { value: "mostaza", label: "Mostaza", color: "#c4952f" },
  { value: "arena", label: "Arena", color: "#c9b493" },
]

export const FONTS: Array<{ value: DiaryFont; label: string; family: string }> = [
  { value: "caveat", label: "Caveat", family: "'Caveat', cursive" },
  { value: "patrick", label: "Patrick Hand", family: "'Patrick Hand', cursive" },
  { value: "kalam", label: "Kalam", family: "'Kalam', cursive" },
  { value: "indie", label: "Indie Flower", family: "'Indie Flower', cursive" },
]

/** Tintas: el color real sale de variables CSS que cambian en modo oscuro (tinta clara). */
export const INKS: Array<{ value: Ink; label: string }> = [
  { value: "sepia", label: "Sepia" },
  { value: "azul", label: "Azul" },
  { value: "verde", label: "Verde" },
  { value: "vino", label: "Vino" },
  { value: "morado", label: "Morado" },
]

/** Resaltadores: franjas translúcidas (se ven en papel claro y en papel nocturno). */
export const HIGHLIGHTS: Array<{ color: string; label: string }> = [
  { color: "rgba(255, 201, 60, 0.45)", label: "Amarillo" },
  { color: "rgba(63, 191, 168, 0.4)", label: "Verde agua" },
  { color: "rgba(245, 138, 176, 0.42)", label: "Rosa" },
  { color: "rgba(74, 143, 231, 0.38)", label: "Azul" },
]

/** Tamaño de cada letra manuscrita: Caveat es pequeña y va más grande; todas quedan sobre los 16 px. */
const FONT_SIZES: Record<string, string> = { caveat: "1.6rem", patrick: "1.3rem", kalam: "1.2rem", indie: "1.3rem" }
export const fontSizeOf = (value: string) => FONT_SIZES[value] ?? "1.4rem"

/**
 * HU19: una carta a mi yo del futuro. `content` solo llega cuando ya se abrió el sobre; antes, el
 * servidor dice cuándo se abre (`opens_on`) y si ya llegó su fecha (`ready`).
 */
export interface Letter {
  id: string
  opens_on: string
  font: DiaryFont
  ink: Ink
  ready: boolean
  opened_at: string | null
  created_at: string
  /** La carta que se estaba leyendo al escribir esta («Sellar otra carta»). */
  follows?: string | null
  content?: string
  /** Solo en una carta abierta: cómo estaba al escribirla, su respuesta y la cadena. */
  moment?: LetterMoment
  reply?: { page: string; notebook: string } | null
  next_letters?: Array<{ id: string; opens_on: string; ready: boolean }>
  previous?: { id: string; written: string } | null
}

/** «Así estabas cuando la escribiste»: la emoción de ese día, la de hoy y huellas de esa semana. */
export interface LetterMoment {
  day: string
  emotion: string | null
  today_emotion: string | null
  traces: Array<{ id: string; sensory_type: string; note: string; emotion: string; mood_intensity: number; at: string }>
}

export interface LetterFields {
  content: string
  opens_on: string
  font: DiaryFont
  ink: Ink
  follows?: string
}

export const coverOf = (value: string) => COVERS.find((cover) => cover.value === value) ?? COVERS[0]
export const fontOf = (value: string) => FONTS.find((font) => font.value === value) ?? FONTS[0]
export const inkVar = (value: string) => `var(--ink-${value})`

export const diaryApi = {
  notebooks: () => api.get<Notebook[]>("diary/notebooks/"),
  createNotebook: (fields: NotebookFields) => api.post<Notebook>("diary/notebooks/", fields),
  updateNotebook: (id: string, fields: Partial<NotebookFields>) => api.patch<Notebook>(`diary/notebooks/${id}/`, fields),
  deleteNotebook: (id: string) => api.delete(`diary/notebooks/${id}/`),
  notebook: (id: string) => api.get<Notebook>(`diary/notebooks/${id}/`),
  pages: (notebookId: string) => api.get<DiaryPage[]>(`diary/notebooks/${notebookId}/pages/`),
  createPage: (notebookId: string, fields: PageChanges = {}) => api.post<DiaryPage>(`diary/notebooks/${notebookId}/pages/`, fields),
  updatePage: (id: string, changes: PageChanges) => api.patch<DiaryPage>(`diary/pages/${id}/`, changes),
  deletePage: (id: string) => api.delete(`diary/pages/${id}/`),
  /** HU18: la IA lee la página y propone huellas y recuerdos. */
  evoke: (id: string) => api.post<{ status: EvokeStatus; page: DiaryPage }>(`diary/pages/${id}/evoke/`),
  acceptSuggestion: (pageId: string, index: number, changes: { name?: string; traces?: number[] }) =>
    api.post<{ memory_id: string; page: DiaryPage }>(`diary/pages/${pageId}/evocation/${index}/accept/`, changes),
  discardSuggestion: (pageId: string, index: number) => api.post<{ page: DiaryPage }>(`diary/pages/${pageId}/evocation/${index}/discard/`),
  /** HU19: mis cartas (sin su contenido mientras sigan selladas). */
  letters: () => api.get<Letter[]>("diary/letters/"),
  letter: (id: string) => api.get<Letter>(`diary/letters/${id}/`),
  sealLetter: (fields: LetterFields) => api.post<Letter>("diary/letters/", fields),
  /** Abre el sobre si ya llegó su fecha y trae la carta. */
  openLetter: (id: string) => api.post<Letter>(`diary/letters/${id}/open/`),
  /** Una página de hoy que responde a la carta (en el cuaderno elegido o el último en que escribí). */
  replyLetter: (id: string, notebook?: string) =>
    api.post<{ page: string; notebook: string }>(`diary/letters/${id}/reply/`, notebook ? { notebook } : {}),
}
