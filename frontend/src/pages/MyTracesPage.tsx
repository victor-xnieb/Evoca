import { CheckCircle2, X } from "lucide-react"
import { createElement, useEffect, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { PageTransition } from "@/components/evoca/PageTransition"
import { TraceCard, TraceCardSkeleton } from "@/components/evoca/TraceCard"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/hooks/use-catalog"
import { getSensoryIcon, type Option } from "@/lib/sensory"
import { labelOf, tracesApi } from "@/lib/traces"
import type { Trace } from "@/lib/types"
import { cn } from "@/lib/utils"

const pill = (selected: boolean) =>
  cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-ring",
  )

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Trace[]; count: number; page: number; hasMore: boolean; loadingMore: boolean }

function FilterRow({
  label,
  allLabel,
  options,
  value,
  onChange,
  renderOption,
}: {
  label: string
  allLabel: string
  options: Option[]
  value: string | null
  onChange: (value: string | null) => void
  renderOption: (option: Option, selected: boolean) => ReactNode
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={value === null} className={pill(value === null)} onClick={() => onChange(null)}>
          {allLabel}
        </button>
        {options.map((option) => renderOption(option, option.value === value))}
      </div>
    </div>
  )
}

/** HU3: todas mis huellas, de la más reciente a la más antigua, filtrables por tipo y emoción. */
export function MyTracesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const { catalog } = useCatalog()
  const type = params.get("tipo")
  const emotion = params.get("emocion")
  const filtered = Boolean(type || emotion)
  const [list, setList] = useState<ListState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const run = { cancelled: false }
    tracesApi
      .list({ sensory_type: type, emotion })
      .then((page) => {
        if (!run.cancelled)
          setList({ status: "ready", items: page.results, count: page.count, page: 1, hasMore: Boolean(page.next), loadingMore: false })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setList({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [type, emotion, attempt])

  const setFilter = (name: "tipo" | "emocion", value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setList({ status: "loading" })
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    setList({ status: "loading" })
    setParams(new URLSearchParams(), { replace: true })
  }

  const loadMore = async () => {
    if (list.status !== "ready") return
    setList({ ...list, loadingMore: true })
    try {
      const page = await tracesApi.list({ sensory_type: type, emotion }, list.page + 1)
      setList({
        status: "ready",
        items: [...list.items, ...page.results],
        count: page.count,
        page: list.page + 1,
        hasMore: Boolean(page.next),
        loadingMore: false,
      })
    } catch (error) {
      setList({ status: "error", message: (error as Error).message })
    }
  }

  const open = (trace: Trace) => navigate(`/mis-huellas/${trace.id}`, { state: { from: location.search } })

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6">
      <h1 className="self-start rounded-2xl bg-background/75 px-3 py-1 text-3xl font-semibold backdrop-blur-md">
        Mis huellas
      </h1>

      {notice && (
        <p role="status" className="inline-flex items-center gap-2 self-start rounded-2xl bg-support px-3 py-2 text-sm font-semibold text-support-ink">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {notice}
        </p>
      )}

      {catalog && (
        <GlassCard as="section" aria-label="Filtros" className="flex flex-col gap-4 p-5">
          <FilterRow
            label="Tipo"
            allLabel="Todos"
            options={catalog.sensory_types}
            value={type}
            onChange={(value) => setFilter("tipo", value)}
            renderOption={(option, selected) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter("tipo", selected ? null : option.value)}
                className={pill(selected)}
              >
                {createElement(getSensoryIcon(option.value), { "aria-hidden": true, className: "size-4" })}
                {option.label}
              </button>
            )}
          />
          <FilterRow
            label="Emoción"
            allLabel="Todas"
            options={catalog.emotions}
            value={emotion}
            onChange={(value) => setFilter("emocion", value)}
            renderOption={(option, selected) => (
              <EmotionChip
                key={option.value}
                emotion={option.value}
                label={option.label}
                size="sm"
                selected={selected}
                onSelect={() => setFilter("emocion", selected ? null : option.value)}
                className="min-h-11"
              />
            )}
          />
        </GlassCard>
      )}

      {list.status === "loading" && (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando tus huellas">
          <TraceCardSkeleton />
          <TraceCardSkeleton />
          <TraceCardSkeleton />
        </div>
      )}

      {list.status === "error" && (
        <GlassCard>
          <EmptyState
            variant="error"
            title="No pudimos cargar tus huellas"
            description={list.message}
            action={
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => {
                  setList({ status: "loading" })
                  setAttempt((value) => value + 1)
                }}
              >
                Reintentar
              </Button>
            }
          />
        </GlassCard>
      )}

      {list.status === "ready" && list.count === 0 && (
        <GlassCard>
          {filtered ? (
            <EmptyState
              compact
              illustration="bloom"
              title="Ninguna huella coincide"
              description="Prueba con otro tipo u otra emoción."
              action={
                <Button variant="outline" className="h-11 rounded-full px-5" onClick={clearFilters}>
                  <X aria-hidden="true" />
                  Quitar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Aún no tienes huellas"
              description="Cuando registres la primera, aparecerá aquí."
              action={
                <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                  <Link to="/nueva-huella">Registrar mi primera huella</Link>
                </Button>
              }
            />
          )}
        </GlassCard>
      )}

      {list.status === "ready" && list.count > 0 && (
        <section aria-labelledby="resultados" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/75 px-3 py-1 backdrop-blur-md">
            <h2 id="resultados" className="text-base font-semibold">
              {list.count} {list.count === 1 ? "huella" : "huellas"}
              {filtered && " con estos filtros"}
            </h2>
            {filtered && (
              <Button variant="ghost" className="h-11 rounded-full px-3" onClick={clearFilters}>
                <X aria-hidden="true" />
                Quitar filtros
              </Button>
            )}
          </div>
          <ul className="flex flex-col gap-3" aria-label="Lista de huellas">
            {list.items.map((trace) => (
              <li key={trace.id}>
                <TraceCard
                  trace={trace}
                  sensoryLabel={labelOf(catalog?.sensory_types ?? [], trace.sensory_type)}
                  emotionLabel={labelOf(catalog?.emotions ?? [], trace.emotion)}
                  onOpen={open}
                />
              </li>
            ))}
          </ul>
          {list.hasMore && (
            <Button variant="outline" className="h-11 self-center rounded-full px-6" onClick={loadMore} disabled={list.loadingMore}>
              {list.loadingMore ? "Cargando…" : "Ver más"}
            </Button>
          )}
        </section>
      )}
    </PageTransition>
  )
}
