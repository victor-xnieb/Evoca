import { useSyncExternalStore } from "react"

/** Network Information API: solo existe en navegadores Chromium. */
interface NetworkInformationLike extends EventTarget {
  saveData?: boolean
}

function connection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

function subscribe(callback: () => void) {
  const current = connection()
  current?.addEventListener?.("change", callback)
  return () => current?.removeEventListener?.("change", callback)
}

const getSnapshot = () => connection()?.saveData === true

/** true si la persona activó el ahorro de datos: no se descargan videos decorativos. */
export function useSaveData(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
