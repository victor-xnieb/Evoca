/*
 * Reglas del cursor interactivo: qué forma toma según el elemento que tiene debajo.
 * Las tarjetas marcan data-cursor="card", las esferas data-cursor="orb" y cualquier elemento
 * puede mostrar una etiqueta corta con data-cursor-label="Ver".
 */
export type CursorState = "default" | "text" | "link" | "card" | "orb" | "hidden"

const FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const TARGET =
  'a[href], button, [role="button"], [role="switch"], [role="tab"], summary, [data-cursor-label], [data-cursor="card"]'
const TEXT = "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, dd"

export interface CursorTarget {
  state: CursorState
  element?: Element
  label?: string
}

/** Decide cómo se ve el cursor según lo que hay debajo (el más cercano gana). */
export function resolveCursorTarget(target: Element | null): CursorTarget {
  if (!target) return { state: "hidden" }
  if (target.closest(FIELD)) return { state: "text" }
  const orb = target.closest('[data-cursor="orb"]')
  if (orb) return { state: "orb", element: orb }
  const element = target.closest(TARGET)
  if (element) {
    const label = element.getAttribute("data-cursor-label") ?? undefined
    return { state: element.getAttribute("data-cursor") === "card" ? "card" : "link", element, label }
  }
  if (target.closest(TEXT)) return { state: "text" }
  return { state: "default" }
}
