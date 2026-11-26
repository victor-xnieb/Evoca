import { HeartHandshake, PenLine, Search, Sparkles, X } from "lucide-react"
import { useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { EmptyState } from "@/components/evoca/EmptyState"
import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { GlassCard } from "@/components/evoca/GlassCard"
import { SimilarityMeter } from "@/components/evoca/SimilarityMeter"
import { TraceCard } from "@/components/evoca/TraceCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MeaningSearchState } from "@/hooks/use-meaning-search"
import { useSupportContent } from "@/hooks/use-support-content"
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@/lib/search"
import { findRiskTerms } from "@/lib/support"
import { labelOf, type TraceCatalog } from "@/lib/traces"
import type { Trace } from "@/lib/types"

import { RiskHelp } from "./RiskHelp"

export interface MeaningSearchFormProps {
  state: MeaningSearchState
  onSearch: (query: string) => void
  /** La frase tiene palabras de riesgo (HU6): no se busca. */
  onRisk: (query: string) => void
  onClear: () => void
}

/**
 * La barra de «Buscar por significado» (HU12), encima de «Mis huellas». Como al escribir una
 * nota (HU6), una palabra de riesgo abre de inmediato la pantalla de ayuda, y esa frase no se
 * busca ni se envía a la IA.
 */
export function MeaningSearchForm({ state, onSearch, onRisk, onClear }: MeaningSearchFormProps) {
  const content = useSupportContent()
  const active = state.status !== "idle"
  const [draft, setDraft] = useState(active ? state.query : "")
  const inputId = useId()
  const hintId = useId()
  const ready = draft.trim().length >= SEARCH_MIN_LENGTH

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!ready) return
    if (findRiskTerms(draft, content?.risk_terms ?? []).length > 0) onRisk(draft)
    else onSearch(draft)
  }

  return (
    <GlassCard as="section" aria-label="Buscar por significado" className="p-5">
      <form role="search" onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="inline-flex items-center gap-2 text-base font-semibold">
          <Sparkles aria-hidden="true" className="size-4" />
          Buscar por significado
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="Por ejemplo: olor a lluvia"
            aria-describedby={hintId}
            className="h-12 rounded-2xl bg-card px-4 text-base"
          />
          <div className="flex gap-2">
            <Button type="submit" className="h-12 flex-1 rounded-full px-5 sm:flex-none" disabled={!ready || state.status === "loading"}>
              <Search aria-hidden="true" />
              Buscar
            </Button>
            {active && (
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-full px-4"
                onClick={() => {
                  setDraft("")
                  onClear()
                }}
              >
                <X aria-hidden="true" />
                Quitar búsqueda
              </Button>
            )}
          </div>
        </div>
        <p id={hintId} className="text-sm text-muted-foreground">
          Escribe lo que recuerdas, con tus palabras: la IA encuentra huellas parecidas aunque no usen las mismas.
        </p>
      </form>
      <RiskHelp text={draft} closeLabel="Volver a la búsqueda" />
    </GlassCard>
  )
}

export interface MeaningSearchResultsProps {
  state: Exclude<MeaningSearchState, { status: "idle" }>
  catalog: TraceCatalog | null
  onOpen: (trace: Trace) => void
  onRetry: () => void
  onClear: () => void
}

/** Resultados de la búsqueda por significado, de la más a la menos parecida (HU12). */
export function MeaningSearchResults({ state, catalog, onOpen, onRetry, onClear }: MeaningSearchResultsProps) {
  const navigate = useNavigate()

  if (state.status === "loading") {
    return (
      <GlassCard className="p-5">
        <div role="status" aria-label="Buscando huellas parecidas" className="flex items-center gap-3">
          <EvocaLoader size="sm" />
          <span className="text-sm text-muted-foreground">Buscando huellas parecidas a «{state.query}»…</span>
        </div>
      </GlassCard>
    )
  }

  if (state.status === "risk") {
    return (
      <GlassCard className="flex flex-col items-center gap-4 p-6 text-center" data-testid="search-risk">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-support text-support-ink">
          <HeartHandshake className="size-7" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-semibold">Estamos aquí contigo</h2>
          <p className="text-base text-muted-foreground">
            Esta búsqueda no la hacemos. Si estás pasando por un momento difícil, hablar con alguien puede ayudar: hay
            personas preparadas para escucharte ahora mismo.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button className="h-11 rounded-full px-5" onClick={() => navigate("/ayuda")}>
            <HeartHandshake aria-hidden="true" />
            Ver líneas de ayuda
          </Button>
          <Button variant="ghost" className="h-11 rounded-full px-4" onClick={onClear}>
            Volver a mis huellas
          </Button>
        </div>
      </GlassCard>
    )
  }

  if (state.status === "error") {
    return (
      <GlassCard>
        <EmptyState
          variant="error"
          title="No pudimos buscar"
          description={state.message}
          action={
            <Button className="h-11 rounded-full px-5" onClick={onRetry}>
              Reintentar
            </Button>
          }
        />
      </GlassCard>
    )
  }

  const { response, query } = state
  const notices = (
    <>
      {response.mode === "words" && (
        <p role="status" className="rounded-2xl bg-background/80 px-4 py-3 text-sm backdrop-blur-md">
          La búsqueda por significado no está disponible en este momento: te mostramos las huellas que contienen esas
          palabras.
        </p>
      )}
      {response.pending > 0 && (
        <p role="status" className="rounded-2xl bg-background/80 px-4 py-3 text-sm backdrop-blur-md">
          Todavía estoy preparando {response.pending} {response.pending === 1 ? "huella" : "huellas"} para buscarlas por
          significado. Vuelve a buscar en un minuto para incluirlas.
        </p>
      )}
    </>
  )

  if (response.count === 0) {
    return (
      <div className="flex flex-col gap-3">
        {notices}
        <GlassCard>
          <EmptyState
            compact
            illustration="bloom"
            title={`No encontramos huellas parecidas a «${query}»`}
            description="Quizá es un recuerdo que todavía no has registrado."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button className="h-11 rounded-full px-5" onClick={() => navigate("/nueva-huella", { state: { note: query } })}>
                  <PenLine aria-hidden="true" />
                  Registrar una huella
                </Button>
                <Button variant="ghost" className="h-11 rounded-full px-4" onClick={onClear}>
                  Ver todas mis huellas
                </Button>
              </div>
            }
          />
        </GlassCard>
      </div>
    )
  }

  return (
    <section aria-labelledby="resultados-busqueda" className="flex flex-col gap-3">
      <h2 id="resultados-busqueda" className="self-start rounded-2xl bg-background/75 px-3 py-1 text-base font-semibold backdrop-blur-md">
        {response.count} {response.count === 1 ? "huella parecida" : "huellas parecidas"} a «{query}»
      </h2>
      {notices}
      <ol className="flex flex-col gap-3" aria-label="Resultados, de la más a la menos parecida">
        {response.results.map((result) => (
          <li key={result.trace.id} className="flex flex-col gap-1.5">
            <SimilarityMeter level={result.level} mode={response.mode} className="self-start" />
            <TraceCard
              trace={result.trace}
              sensoryLabel={labelOf(catalog?.sensory_types ?? [], result.trace.sensory_type)}
              emotionLabel={labelOf(catalog?.emotions ?? [], result.trace.emotion)}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
