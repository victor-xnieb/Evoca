import { useSyncExternalStore } from "react"

function subscribe(callback: () => void) {
  document.addEventListener("visibilitychange", callback)
  return () => document.removeEventListener("visibilitychange", callback)
}

const getSnapshot = () => !document.hidden

/** false mientras la pestaña está oculta: las animaciones continuas se pausan. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
