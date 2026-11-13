import { Sparkles } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"

import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { GlassCard } from "@/components/evoca/GlassCard"
import { MemorySuggestionCard } from "@/components/evoca/MemorySuggestionCard"
import { Button } from "@/components/ui/button"
import type { UseMemorySuggestions } from "@/hooks/use-memory-suggestions"
import { labelOf, type TraceCatalog } from "@/lib/traces"

export interface SuggestionsSectionProps {
  suggestions: UseMemorySuggestions
  catalog: TraceCatalog | null
}

/** Qué decir cuando no hay sugerencias, según el motivo que dio el servidor. */
function emptyMessage(reason: string | null, traceCount: number, minTraces: number) {
  switch (reason) {
    case "too_few_traces": {
      const missing = Math.max(1, minTraces - traceCount)
      return `Registra ${missing} ${missing === 1 ? "huella más" : "huellas más"} y la IA te propondrá recuerdos a partir de ellas.`
    }
    case "all_grouped":
      return "Todas tus huellas ya están en un recuerdo. Cuando registres nuevas, la IA buscará con qué van."
    case "unavailable":
      return "La IA no está disponible en este momento. Puedes intentarlo de nuevo más tarde."
    case "none":
      return "La IA no encontró huellas que vayan juntas por ahora. Con más huellas, tendrá más de dónde elegir."
    default:
      return "No tienes sugerencias pendientes."
  }
}

/**
 * HU9: las sugerencias de la IA, encima del mapa. Al abrir «Recuerdos» la app las carga y,
 * con huellas suficientes, le pide a la IA una vez por sesión; después, con el botón.
 */
export function SuggestionsSection({ suggestions, catalog }: SuggestionsSectionProps) {
  const navigate = useNavigate()
  const { state, ask, reload, accept, rename, removeTrace, discard } = suggestions
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sensoryLabel = (value: string) => labelOf(catalog?.sensory_types ?? [], value)
  const emotionLabel = (value: string) => labelOf(catalog?.emotions ?? [], value)

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id)
    setErrors((current) => ({ ...current, [id]: "" }))
    try {
      await action()
    } catch (error) {
      setErrors((current) => ({ ...current, [id]: (error as Error).message }))
    } finally {
      setBusyId(null)
    }
  }

  if (state.status === "loading") {
    return (
      <section aria-labelledby="sugerencias" className="flex flex-col gap-3">
        <Heading />
        <GlassCard className="p-5">
          <div role="status" aria-label="Cargando tus sugerencias" className="flex items-center gap-3">
            <EvocaLoader size="sm" />
            <span className="text-sm text-muted-foreground">Buscando tus sugerencias…</span>
          </div>
        </GlassCard>
      </section>
    )
  }

  if (state.status === "error") {
    return (
      <section aria-labelledby="sugerencias" className="flex flex-col gap-3">
        <Heading />
        <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">No pudimos cargar tus sugerencias. {state.message}</p>
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={reload}>
            Reintentar
          </Button>
        </GlassCard>
      </section>
    )
  }

  const { summary, asking, reason, askError } = state
  const list = summary.suggestions
  // Sin pedirle nada a la IA ya se sabe si faltan huellas o si todas están agrupadas.
  const effectiveReason =
    reason ?? (summary.trace_count < summary.min_traces ? "too_few_traces" : summary.can_suggest ? null : "all_grouped")

  return (
    <section aria-labelledby="sugerencias" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading count={list.length} />
        {summary.can_suggest && !asking && (
          <Button variant="outline" className="h-11 rounded-full bg-card/90 px-5 backdrop-blur-md" onClick={ask}>
            <Sparkles aria-hidden="true" />
            {list.length > 0 ? "Buscar más sugerencias" : "Buscar sugerencias"}
          </Button>
        )}
      </div>

      {asking && (
        <GlassCard className="p-5">
          <div role="status" aria-label="La IA está leyendo tus huellas" className="flex items-center gap-3">
            <EvocaLoader size="sm" />
            <span className="text-sm text-muted-foreground">La IA está leyendo tus huellas para proponerte recuerdos…</span>
          </div>
        </GlassCard>
      )}

      {askError && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {askError}
        </p>
      )}

      {list.map((suggestion) => (
        <MemorySuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          sensoryLabel={sensoryLabel}
          emotionLabel={emotionLabel}
          busy={busyId === suggestion.id}
          error={errors[suggestion.id] || null}
          onAccept={() => run(suggestion.id, () => accept(suggestion.id))}
          onRename={(name) => run(suggestion.id, () => rename(suggestion.id, name))}
          onRemoveTrace={(trace) => run(suggestion.id, () => removeTrace(suggestion.id, trace.id))}
          onDiscard={() => run(suggestion.id, () => discard(suggestion.id))}
          onOpenTrace={(trace) => navigate(`/mis-huellas/${trace.id}`)}
        />
      ))}

      {list.length === 0 && !asking && (
        <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted-foreground">{emptyMessage(effectiveReason, summary.trace_count, summary.min_traces)}</p>
          {effectiveReason === "too_few_traces" && (
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link to="/nueva-huella">Registrar una huella</Link>
            </Button>
          )}
        </GlassCard>
      )}
    </section>
  )
}

function Heading({ count }: { count?: number }) {
  return (
    <h2 id="sugerencias" className="inline-flex items-center gap-2 rounded-2xl bg-background/75 px-3 py-1 text-base font-semibold backdrop-blur-md">
      <Sparkles aria-hidden="true" className="size-4" />
      Sugerencias de la IA
      {count ? <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{count}</span> : null}
    </h2>
  )
}
