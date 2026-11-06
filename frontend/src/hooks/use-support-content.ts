import { useEffect, useState } from "react"

import { supportApi, type SupportContent } from "@/lib/support"

// Copia de la última versión recibida, para que las palabras de riesgo y las líneas de ayuda
// funcionen aunque no haya conexión. No es un dato personal: es el mismo contenido para todos.
const STORAGE_KEY = "evoca.support"

let cached: SupportContent | null = null

function stored(): SupportContent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SupportContent) : null
  } catch {
    return null
  }
}

/** Solo para pruebas: olvida el contenido guardado en memoria. */
export function resetSupportContentCache() {
  cached = null
}

/**
 * Contenido de orientación vigente (HU6). Se muestra al instante lo último conocido y, cada
 * vez que una pantalla lo usa, se vuelve a pedir: si el psicólogo asesor aprobó una versión
 * nueva, la app la usa sin publicar una nueva versión.
 */
export function useSupportContent() {
  const [content, setContent] = useState<SupportContent | null>(() => cached ?? stored())

  useEffect(() => {
    let cancelled = false
    supportApi
      .content()
      .then((fresh) => {
        cached = fresh
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
        } catch {
          // Sin almacenamiento: se usa solo en memoria.
        }
        if (!cancelled) setContent(fresh)
      })
      .catch(() => {
        // Sin conexión: se queda la última versión conocida.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return content
}
