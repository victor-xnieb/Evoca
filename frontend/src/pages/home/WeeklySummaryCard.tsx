import { ChevronDown, Sparkles } from "lucide-react"
import { createElement, useId, useState } from "react"
import { Link } from "react-router"

import { GlassCard } from "@/components/evoca/GlassCard"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/hooks/use-catalog"
import { useWeeklySummary } from "@/hooks/use-weekly-summary"
import { formatDate } from "@/lib/format"
import { getSensoryIcon } from "@/lib/sensory"
import { labelOf } from "@/lib/traces"
import { weekRange, type WeeklyPattern } from "@/lib/weekly"

const plural = (count: number) => `${count} ${count === 1 ? "registro" : "registros"}`

function Pattern({ pattern, index }: { pattern: WeeklyPattern; index: number }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { catalog } = useCatalog()
  const emotion = (value: string) => labelOf(catalog?.emotions ?? [], value)
  const sensory = (value: string) => labelOf(catalog?.sensory_types ?? [], value)

  return (
    <li className="flex flex-col gap-2 rounded-2xl border bg-card px-4 py-3">
      <p className="text-base">
        <span className="sr-only">Patrón {index + 1}: </span>
        {pattern.text}
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Calculado con {plural(pattern.trace_count)}
        <ChevronDown aria-hidden="true" className={open ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"} />
      </button>
      {open && (
        <ul id={listId} aria-label={`Registros del patrón ${index + 1}`} className="flex flex-col gap-1.5">
          {pattern.traces.map((trace) => (
            <li key={trace.id}>
              <Link
                to={`/mis-huellas/${trace.id}`}
                className="flex items-center gap-3 rounded-xl bg-background/60 px-3 py-2 text-sm hover:bg-background focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {createElement(getSensoryIcon(trace.sensory_type), { "aria-hidden": true, className: "size-4 shrink-0", strokeWidth: 1.8 })}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{trace.note}</span>
                  <span className="text-muted-foreground">
                    {formatDate(trace.date, { weekday: "long", day: "numeric", month: "long" })} · {sensory(trace.sensory_type)} ·{" "}
                    {emotion(trace.emotion)} {trace.mood_intensity} · ánimo {trace.mood} de 5
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {pattern.traces.length < pattern.trace_count && (
            <li className="px-3 text-xs text-muted-foreground">
              {pattern.trace_count - pattern.traces.length === 1
                ? "Un registro ya no está: lo borraste."
                : `${pattern.trace_count - pattern.traces.length} registros ya no están: los borraste.`}
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

/**
 * HU14: «Tu semana», el resumen de la semana pasada (lunes a domingo) con 1 a 3 patrones entre
 * las huellas y el ánimo, escritos como observaciones y con los registros de cada uno. Si la
 * persona lo desactivó en Ajustes, no aparece.
 */
export function WeeklySummaryCard() {
  const { state, retry } = useWeeklySummary()

  if (state.status === "hidden") return null
  if (state.status === "loading") {
    return <div aria-hidden="true" className="h-28 animate-pulse rounded-3xl bg-secondary/70" />
  }
  const { summary } = state
  if (summary.status === "disabled") return null
  const range = weekRange(summary.week_start, summary.week_end)

  return (
    <GlassCard as="section" aria-labelledby="tu-semana" accent="calma" className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="tu-semana" className="text-xl font-semibold">
            Tu semana
          </h2>
          <p className="text-sm text-muted-foreground">
            Del {range} · {plural(summary.count)}
          </p>
        </div>
      </div>

      {state.status === "preparing" && (
        <p role="status" className="text-sm text-muted-foreground">
          Estamos preparando tu resumen de la semana…
        </p>
      )}

      {summary.status === "too_few" && (
        <p className="text-sm">
          La semana pasada registraste {summary.count} {summary.count === 1 ? "huella" : "huellas"}. Con {summary.required} o más te mostramos patrones entre tus huellas
          y tu ánimo: {summary.missing === 1 ? "faltó 1" : `faltaron ${summary.missing}`}.
        </p>
      )}

      {summary.status === "unavailable" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
          <p className="flex-1">No pudimos preparar tu resumen ahora. Tus huellas están a salvo.</p>
          <Button variant="outline" size="sm" onClick={retry}>
            Intentar de nuevo
          </Button>
        </div>
      )}

      {summary.status === "ready" && (
        <>
          <ol aria-label="Patrones de tu semana" className="flex flex-col gap-3">
            {summary.patterns.map((pattern, index) => (
              <Pattern key={pattern.text} pattern={pattern} index={index} />
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Son observaciones de tus registros, no diagnósticos. El ánimo combina la emoción y su intensidad. Puedes desactivar
            este resumen en <Link to="/ajustes" className="underline underline-offset-2">Ajustes</Link>.
          </p>
        </>
      )}
    </GlassCard>
  )
}
