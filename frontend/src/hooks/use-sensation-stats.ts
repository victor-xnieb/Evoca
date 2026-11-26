import { useCallback, useEffect, useState } from "react"

import { statsApi, type SensationStats, type StatsPeriod } from "@/lib/stats"

/** Cada pedido reconoce unas 80 huellas: 5 rondas alcanzan para 400. */
const MAX_ROUNDS = 5

export type SensationStatsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      data: SensationStats
      /** La IA está reconociendo los elementos que faltan. */
      recognizing: boolean
      /** La IA no pudo reconocerlos ahora; los tipos y el ánimo ya están completos. */
      unavailable: boolean
    }

/**
 * HU13: estadísticas de mis sensaciones. Primero llegan los tipos y el ánimo (sin IA); si hay
 * huellas cuyo elemento aún no se reconoce, se le pide al servidor que lo haga y se vuelven a
 * cargar, para que los elementos más frecuentes aparezcan completos.
 */
export function useSensationStats(period: StatsPeriod) {
  const [attempt, setAttempt] = useState(0)
  const key = `${period}:${attempt}`
  const [result, setResult] = useState<{ key: string; state: SensationStatsState } | null>(null)

  useEffect(() => {
    const run = { cancelled: false }
    const show = (state: SensationStatsState) => {
      if (!run.cancelled) setResult({ key, state })
    }

    async function load() {
      const first = await statsApi.get(period)
      if (!first.ready || first.pending === 0) return show({ status: "ready", data: first, recognizing: false, unavailable: false })
      show({ status: "ready", data: first, recognizing: true, unavailable: false })

      let unavailable = false
      try {
        for (let round = 0; round < MAX_ROUNDS && !run.cancelled; round++) {
          const extraction = await statsApi.extract()
          if (extraction.status !== "ok") {
            unavailable = true
            break
          }
          if (extraction.pending === 0 || extraction.extracted === 0) break
        }
      } catch {
        // Sin red o con el límite de pedidos: se queda con lo que ya se reconoció.
        unavailable = true
      }
      if (run.cancelled) return
      try {
        const data = await statsApi.get(period)
        show({ status: "ready", data, recognizing: false, unavailable: unavailable && data.pending > 0 })
      } catch {
        show({ status: "ready", data: first, recognizing: false, unavailable: true })
      }
    }

    load().catch((error: Error) => show({ status: "error", message: error.message }))
    return () => {
      run.cancelled = true
    }
  }, [key, period])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: SensationStatsState = result?.key === key ? result.state : { status: "loading" }
  return { state, retry }
}
