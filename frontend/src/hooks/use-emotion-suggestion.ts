import { useEffect, useState } from "react"

import {
  countWords,
  SUGGEST_MIN_WORDS,
  SUGGEST_PAUSE_MS,
  SUGGEST_TIMEOUT_MS,
  suggestionApi,
  type EmotionSuggestion,
} from "@/lib/suggestion"

interface SuggestionState {
  /** Nota para la que se pidió (o se está pidiendo) la sugerencia. */
  note: string
  loading: boolean
  suggestion: EmotionSuggestion | null
}

/**
 * HU8: cuando la nota tiene 10 palabras o más y la persona deja de escribir, pide una
 * sugerencia. La sugerencia vale solo para el texto con el que se pidió: si la nota cambia,
 * desaparece hasta que llegue la nueva. Si la IA no responde a tiempo o no está segura,
 * simplemente no hay sugerencia.
 */
export function useEmotionSuggestion(note: string) {
  const [state, setState] = useState<SuggestionState>({ note: "", loading: false, suggestion: null })
  const text = note.trim()
  const eligible = countWords(text) >= SUGGEST_MIN_WORDS

  useEffect(() => {
    if (!eligible) return
    const controller = new AbortController()
    // «replaced»: la nota cambió y otra petición tomará su lugar; esta ya no actualiza nada.
    const run = { timeout: 0, replaced: false }
    const pause = window.setTimeout(() => {
      setState({ note: text, loading: true, suggestion: null })
      run.timeout = window.setTimeout(() => controller.abort(), SUGGEST_TIMEOUT_MS)
      suggestionApi
        .suggest(text, controller.signal)
        .then((response) => setState({ note: text, loading: false, suggestion: response.suggestion }))
        .catch(() => {
          // Error o espera agotada: se sigue sin sugerencia.
          if (!run.replaced) setState({ note: text, loading: false, suggestion: null })
        })
        .finally(() => window.clearTimeout(run.timeout))
    }, SUGGEST_PAUSE_MS)
    return () => {
      run.replaced = true
      window.clearTimeout(pause)
      window.clearTimeout(run.timeout)
      controller.abort()
    }
  }, [text, eligible])

  const current = eligible && state.note === text
  return { loading: current && state.loading, suggestion: current ? state.suggestion : null }
}
