import { useCallback, useEffect, useState } from "react"

import { weeklyApi, type WeeklySummary } from "@/lib/weekly"

export type WeeklySummaryState =
  | { status: "loading" }
  /** No se pudo consultar: la tarjeta no se muestra (Inicio sigue igual). */
  | { status: "hidden" }
  | { status: "preparing"; summary: WeeklySummary }
  | { status: "ready"; summary: WeeklySummary }

/**
 * HU14: el resumen de la semana pasada. Si aún no está preparado, se le pide al servidor que
 * lo prepare con la IA (una sola vez por semana; luego queda guardado).
 */
export function useWeeklySummary() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; state: WeeklySummaryState } | null>(null)

  useEffect(() => {
    const run = { cancelled: false }
    const show = (state: WeeklySummaryState) => {
      if (!run.cancelled) setResult({ attempt, state })
    }
    async function load() {
      const first = await weeklyApi.get()
      if (first.status !== "pending") return show({ status: "ready", summary: first })
      show({ status: "preparing", summary: first })
      try {
        show({ status: "ready", summary: await weeklyApi.generate() })
      } catch {
        show({ status: "ready", summary: { ...first, status: "unavailable" } })
      }
    }
    load().catch(() => show({ status: "hidden" }))
    return () => {
      run.cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: WeeklySummaryState = result?.attempt === attempt ? result.state : { status: "loading" }
  return { state, retry }
}
