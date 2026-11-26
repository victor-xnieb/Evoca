import { useCallback, useEffect, useRef, useState } from "react"

import { searchApi, SEARCH_TIMEOUT_MS, type SearchResponse } from "@/lib/search"

export type MeaningSearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "ready"; query: string; response: SearchResponse }
  | { status: "error"; query: string; message: string }

/**
 * La última búsqueda, en memoria (no en el navegador): al abrir una huella y volver, los
 * resultados siguen ahí sin pedirlos otra vez. Se pierde al recargar o al cambiar de cuenta.
 */
let last: { userId: string; state: MeaningSearchState } | null = null

/** Solo para pruebas: olvida la última búsqueda. */
export function resetMeaningSearch() {
  last = null
}

/** HU12: buscar huellas por significado desde «Mis huellas». */
export function useMeaningSearch(userId: string | undefined) {
  const [state, setState] = useState<MeaningSearchState>(() =>
    last && userId && last.userId === userId && last.state.status === "ready" ? last.state : { status: "idle" },
  )
  const running = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!userId) return
    last = state.status === "ready" ? { userId, state } : state.status === "idle" ? null : last
  }, [state, userId])

  useEffect(() => () => running.current?.abort(), [])

  const search = useCallback((raw: string) => {
    const query = raw.trim()
    running.current?.abort()
    const controller = new AbortController()
    running.current = controller
    const timeout = window.setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
    setState({ status: "loading", query })
    searchApi
      .search(query, controller.signal)
      .then((response) => {
        if (running.current === controller) setState({ status: "ready", query, response })
      })
      .catch((error: Error) => {
        if (running.current !== controller) return
        const message = error.name === "AbortError" ? "La búsqueda tardó demasiado. Inténtalo de nuevo." : error.message
        setState({ status: "error", query, message })
      })
      .finally(() => window.clearTimeout(timeout))
  }, [])

  const clear = useCallback(() => {
    running.current?.abort()
    running.current = null
    setState({ status: "idle" })
  }, [])

  return { state, search, clear }
}
