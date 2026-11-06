import { useSyncExternalStore } from "react"

/** Mouse o trackpad: puntero preciso que además puede «pasar por encima» sin tocar. */
export const FINE_POINTER_QUERY = "(pointer: fine) and (hover: hover)"

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const media = window.matchMedia(FINE_POINTER_QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

const getSnapshot = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(FINE_POINTER_QUERY).matches

/** true con mouse; false en pantallas táctiles (ahí no hay inclinación, foco de luz ni cursor). */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
