import { useCallback, useEffect, useState } from "react"

import { islandsApi, type IslandsData } from "@/lib/islands"

export type IslandsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  /** La IA está calculando (la primera vez o al pedir volver a calcular). */
  | { status: "calculating"; data: IslandsData | null }
  | { status: "ready"; data: IslandsData }

/**
 * HU15: mis islas. La primera vez se calculan solas al abrir la vista; después quedan
 * guardadas y solo se recalculan cuando la persona lo pide.
 */
export function useIslands() {
  const [state, setState] = useState<IslandsState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const run = { cancelled: false }
    async function load() {
      const first = await islandsApi.get()
      if (run.cancelled) return
      if (first.status !== "pending") return setState({ status: "ready", data: first })
      setState({ status: "calculating", data: first })
      const calculated = await islandsApi.calculate()
      if (!run.cancelled) setState({ status: "ready", data: calculated })
    }
    load().catch((error: Error) => {
      if (!run.cancelled) setState({ status: "error", message: error.message })
    })
    return () => {
      run.cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((value) => value + 1)
  }, [])

  const recalculate = useCallback(async () => {
    setState((current) => ({ status: "calculating", data: current.status === "ready" ? current.data : null }))
    try {
      const data = await islandsApi.calculate()
      setState((current) => {
        const previous = current.status === "calculating" ? current.data : null
        // Si la IA falla al recalcular, se siguen viendo las islas de antes, con el aviso.
        return data.status === "unavailable" && previous && previous.status === "ready"
          ? { status: "ready", data: { ...previous, status: "unavailable" } }
          : { status: "ready", data }
      })
    } catch (error) {
      setState({ status: "error", message: (error as Error).message })
    }
  }, [])

  const update = useCallback(async (id: string, changes: { name?: string; hidden?: boolean }) => {
    const data = await islandsApi.update(id, changes)
    setState({ status: "ready", data })
  }, [])

  return { state, retry, recalculate, update }
}
