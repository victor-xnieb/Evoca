import { useCallback, useEffect, useState } from "react"

import { tracesApi, type TraceCatalog } from "@/lib/traces"

let cached: TraceCatalog | null = null

/** Solo para pruebas: olvida el catálogo guardado. */
export function resetCatalogCache() {
  cached = null
}

/** Catálogo de tipos y emociones. Se pide una vez por sesión y se reutiliza. */
export function useCatalog() {
  const [state, setState] = useState<{ catalog: TraceCatalog | null; error: string | null }>({
    catalog: cached,
    error: null,
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (cached) return
    let cancelled = false
    tracesApi
      .catalog()
      .then((catalog) => {
        cached = catalog
        if (!cancelled) setState({ catalog, error: null })
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ catalog: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ catalog: null, error: null })
    setAttempt((value) => value + 1)
  }, [])

  return { ...state, loading: !state.catalog && !state.error, retry }
}
