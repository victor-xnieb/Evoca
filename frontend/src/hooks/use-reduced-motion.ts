import { createContext, useContext, useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getSnapshot() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches
}

/** Lee la preferencia del sistema operativo y reacciona si la persona la cambia. */
export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/**
 * Valor efectivo de movimiento reducido. Lo provee MotionPreferenceProvider, que combina
 * la preferencia del sistema con una anulación opcional (por ejemplo, desde Storybook).
 */
export const ReducedMotionContext = createContext<boolean | null>(null)

/**
 * Hook compartido para todas las animaciones de Evoca: devuelve true cuando se deben
 * reducir o eliminar (sin desplazamientos, sin bucles, sin «latidos»).
 */
export function useReducedMotion(): boolean {
  const fromProvider = useContext(ReducedMotionContext)
  const fromSystem = useSystemReducedMotion()
  return fromProvider ?? fromSystem
}
