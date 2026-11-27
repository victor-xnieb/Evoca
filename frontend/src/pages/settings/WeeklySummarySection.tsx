import { Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { GlassCard } from "@/components/evoca/GlassCard"
import { cn } from "@/lib/utils"
import { weeklyApi } from "@/lib/weekly"

/** HU14 · Escenario 3: activar o desactivar el resumen semanal de patrones. */
export function WeeklySummarySection() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    const run = { cancelled: false }
    weeklyApi
      .settings()
      .then((data) => {
        if (!run.cancelled) setEnabled(data.enabled)
      })
      .catch((error: Error) => {
        if (!run.cancelled) setWarning(error.message)
      })
    return () => {
      run.cancelled = true
    }
  }, [])

  const toggle = async () => {
    if (enabled === null) return
    setBusy(true)
    setWarning(null)
    try {
      const saved = await weeklyApi.saveSettings(!enabled)
      setEnabled(saved.enabled)
      setNotice(
        saved.enabled
          ? "Activaste el resumen semanal: lo verás en Inicio cada lunes."
          : "Desactivaste el resumen semanal: ya no aparecerá en Inicio.",
      )
    } catch (error) {
      setWarning((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard as="section" aria-labelledby="resumen-semanal" className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="resumen-semanal" className="text-xl font-semibold">
            Resumen semanal
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada lunes, la IA busca de 1 a 3 patrones entre tus huellas y tu ánimo de la semana pasada (con 5 registros o más) y
            te los muestra en Inicio.
          </p>
        </div>
      </div>

      {enabled !== null && (
        // Toda la fila es el interruptor, como el del recordatorio.
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy}
          onClick={toggle}
          className={cn(
            "flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-2 text-left font-semibold",
            "transition-colors hover:bg-background/80 disabled:opacity-60",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          Recibir el resumen semanal
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 ring-1 transition-colors duration-300 ring-inset",
              enabled ? "bg-primary ring-primary" : "bg-input ring-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "size-6 rounded-full shadow-sm transition-transform duration-300 ease-spring",
                enabled ? "translate-x-6 bg-primary-foreground" : "translate-x-0 bg-background",
              )}
            />
          </span>
        </button>
      )}

      {notice && (
        <p role="status" className="text-sm font-medium">
          {notice}
        </p>
      )}
      {warning && <p className="rounded-2xl bg-support p-3 text-sm text-support-ink">{warning}</p>}
    </GlassCard>
  )
}
