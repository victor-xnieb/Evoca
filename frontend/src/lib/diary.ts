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
}
