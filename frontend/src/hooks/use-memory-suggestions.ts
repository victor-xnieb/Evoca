import { useCallback, useEffect, useRef, useState } from "react"

import { memoriesApi, SUGGEST_MEMORIES_TIMEOUT_MS, type MemorySuggestion, type SuggestReason, type SuggestionsSummary } from "@/lib/memories"

/** Una vez por sesión (y por persona) se le pide a la IA sin que nadie toque nada. */
const ASKED_KEY = (userId: string) => `evoca.memories.asked:${userId}`

function wasAsked(userId: string) {
  try {
    return window.sessionStorage.getItem(ASKED_KEY(userId)) === "1"
  } catch {
    return false
  }
}

function markAsked(userId: string) {
  try {
    window.sessionStorage.setItem(ASKED_KEY(userId), "1")
  } catch {
    // Sin almacenamiento: se volverá a pedir al abrir de nuevo.
  }
}

export type SuggestionsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: SuggestionsSummary; asking: boolean; reason: SuggestReason | null; askError: string | null }

export interface UseMemorySuggestions {
  state: SuggestionsState
  /** Pide recuerdos nuevos a la IA (botón «Buscar sugerencias»). */
  ask: () => void
  reload: () => void
  accept: (id: string, name?: string) => Promise<MemorySuggestion>
  rename: (id: string, name: string) => Promise<MemorySuggestion>
  removeTrace: (id: string, traceId: string) => Promise<MemorySuggestion>
  discard: (id: string) => Promise<void>
}

/**
 * HU9: al abrir «Recuerdos» se cargan las sugerencias pendientes y, si no hay y vale la pena
 * (5 huellas o más y al menos dos sueltas), se le pide a la IA una vez por sesión. Aceptar o
 * descartar una sugerencia la saca de la lista y avisa (`onDecided`) para refrescar el mapa.
 */
export function useMemorySuggestions(userId: string | undefined, onDecided?: () => void): UseMemorySuggestions {
  const [state, setState] = useState<SuggestionsState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const asking = useRef<AbortController | null>(null)
  const decided = useRef(onDecided)
  useEffect(() => {
    decided.current = onDecided
  })

  const ask = useCallback(() => {
    if (asking.current) return
    const controller = new AbortController()
    asking.current = controller
    const timeout = window.setTimeout(() => controller.abort(), SUGGEST_MEMORIES_TIMEOUT_MS)
    setState((current) => (current.status === "ready" ? { ...current, asking: true, askError: null } : current))
    memoriesApi
      .suggest(controller.signal)
      .then((response) => {
        setState((current) => {
          const previous = current.status === "ready" ? current.summary.suggestions : []
          return {
            status: "ready",
            summary: { ...response, suggestions: [...response.suggestions, ...previous] },
            asking: false,
            reason: response.reason,
            askError: null,
          }
        })
      })
      .catch((error: Error) => {
        const message = error.name === "AbortError" ? "La IA tardó demasiado en responder." : error.message
        setState((current) => (current.status === "ready" ? { ...current, asking: false, askError: message } : current))
      })
      .finally(() => {
        window.clearTimeout(timeout)
        asking.current = null
      })
  }, [])

  useEffect(() => {
    const run = { cancelled: false }
    memoriesApi
      .suggestions()
      .then((summary) => {
        if (run.cancelled) return
        setState({ status: "ready", summary, asking: false, reason: null, askError: null })
        // Escenario 1: con huellas suficientes, la app sugiere sola; luego, a pedido.
        if (userId && summary.can_suggest && summary.suggestions.length === 0 && !wasAsked(userId)) {
          markAsked(userId)
          ask()
        }
      })
      .catch((error: Error) => {
        if (!run.cancelled) setState({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [userId, attempt, ask])

  useEffect(() => () => asking.current?.abort(), [])

  const replace = (updated: MemorySuggestion) =>
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            summary: {
              ...current.summary,
              suggestions: current.summary.suggestions.map((item) => (item.id === updated.id ? updated : item)),
            },
          }
        : current,
    )

  const remove = (id: string) =>
    setState((current) =>
      current.status === "ready"
        ? { ...current, summary: { ...current.summary, suggestions: current.summary.suggestions.filter((item) => item.id !== id) } }
        : current,
    )

  return {
    state,
    ask,
    reload: () => {
      setState({ status: "loading" })
      setAttempt((value) => value + 1)
    },
    accept: async (id, name) => {
      const accepted = await memoriesApi.accept(id, name)
      remove(id)
      decided.current?.()
      return accepted
    },
    rename: async (id, name) => {
      const renamed = await memoriesApi.rename(id, name)
      replace(renamed)
      return renamed
    },
    removeTrace: async (id, traceId) => {
      const updated = await memoriesApi.removeTrace(id, traceId)
      replace(updated)
      return updated
    },
    discard: async (id) => {
      await memoriesApi.discard(id)
      remove(id)
      decided.current?.()
    },
  }
}
