import { useSyncExternalStore } from "react"

import type { Orientation } from "@/lib/backgrounds"

const QUERY = "(orientation: portrait)"

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getSnapshot(): Orientation {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches
    ? "portrait"
    : "landscape"
}

/** Orientación de la pantalla; cambia al girar el celular o redimensionar la ventana. */
export function useOrientation(): Orientation {
  return useSyncExternalStore(subscribe, getSnapshot, () => "portrait")
}
