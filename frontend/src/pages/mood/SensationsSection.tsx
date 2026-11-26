import { createElement, useId, useState } from "react"
import { Link } from "react-router"

import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { SensationBars } from "@/components/evoca/SensationBars"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSensationStats } from "@/hooks/use-sensation-stats"
import { formatAverage } from "@/lib/format"
import { getSensoryIcon } from "@/lib/sensory"
import { countLabel, observation, type SensationElement, type SensationStats, type StatsPeriod } from "@/lib/stats"

const PERIODS: Array<{ value: StatsPeriod; label: string; phrase: string }> = [
  { value: "month", label: "30 días", phrase: "En los últimos 30 días" },
  { value: "all", label: "Total", phrase: "En total" },
]

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function ElementList({
  elements,
  labelOf,
  label,
  showType = true,
}: {
  elements: SensationElement[]
  labelOf: (type: string) => string
  label: string
  /** En el detalle de un tipo no se repite el tipo en cada elemento. */
  showType?: boolean
}) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2">
      {elements.map((element, index) => (
        <li key={`${element.type}:${element.name}`} className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-2">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
            {index + 1}
          </span>
          {createElement(getSensoryIcon(element.type), { "aria-hidden": true, className: "size-4 shrink-0", strokeWidth: 1.8 })}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{capitalize(element.name)}</span>
            <span className="text-sm text-muted-foreground">
              {[
                showType && labelOf(element.type),
                countLabel(element.count),
                // Espacios que no se cortan: «ánimo 4,3 de 5» no se parte al final de la línea.
                element.average_mood !== null && `ánimo\u00a0${formatAverage(element.average_mood)}\u00a0de\u00a05`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function Recognition({ data, recognizing, unavailable, onRetry }: { data: SensationStats; recognizing: boolean; unavailable: boolean; onRetry: () => void }) {
  if (recognizing) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Estamos reconociendo los elementos de {countLabel(data.pending)}…
      </p>
    )
  }
  if (unavailable) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
        <p className="flex-1">
          No pudimos reconocer ahora los elementos de {countLabel(data.pending)}. Los tipos y el ánimo ya están completos.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }
  return null
}

/** HU13: qué aromas, canciones o lugares registro más y con qué ánimo. */
export function SensationsSection() {
  const [period, setPeriod] = useState<StatsPeriod>("month")
  const [selected, setSelected] = useState<string | null>(null)
  const { state, retry } = useSensationStats(period)
  const detailId = useId()
  const current = PERIODS.find((item) => item.value === period) ?? PERIODS[0]
  const data = state.status === "ready" ? state.data : null
  const labelOf = (type: string) => data?.types.find((item) => item.type === type)?.label ?? type
  const detail = data?.types.find((item) => item.type === selected) ?? null

  return (
    <GlassCard as="section" aria-labelledby="sensaciones" className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="sensaciones" className="text-xl font-semibold">
            Mis sensaciones
          </h2>
          <p className="text-sm text-muted-foreground">Qué aromas, canciones o lugares registras más y con qué ánimo.</p>
        </div>
        {(state.status !== "ready" || state.data.ready) && (
          <Tabs value={period} onValueChange={(value) => setPeriod(value as StatsPeriod)}>
            <TabsList className="h-12 rounded-full p-1" aria-label="Periodo de las estadísticas">
              {PERIODS.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="h-10 rounded-full px-5 text-sm">
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando tus estadísticas">
          <div className="h-5 w-56 animate-pulse rounded-full bg-secondary" />
          <div className="h-56 animate-pulse rounded-3xl bg-secondary" />
        </div>
      )}

      {state.status === "error" && (
        <EmptyState
          variant="error"
          compact
          title="No pudimos cargar tus estadísticas"
          description={state.message}
          action={<Button onClick={retry}>Intentar de nuevo</Button>}
        />
      )}

      {data && !data.ready && (
        <EmptyState
          compact
          title={`Te ${data.missing === 1 ? "falta 1 huella" : `faltan ${data.missing} huellas`} para ver tus estadísticas`}
          description={`Con ${data.required} huellas ya podemos mostrarte qué registras más y con qué ánimo. Llevas ${data.total} de ${data.required}.`}
          action={
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
              <Link to="/nueva-huella">Registrar una huella</Link>
            </Button>
          }
        />
      )}

      {data?.ready && data.count === 0 && (
        <EmptyState
          compact
          title="No registraste huellas en los últimos 30 días"
          description="Tus estadísticas de siempre siguen en «Total»."
          action={<Button onClick={() => setPeriod("all")}>Ver el total</Button>}
        />
      )}

      {data?.ready && data.count > 0 && state.status === "ready" && (
        <>
          <p className="text-base font-semibold sm:text-lg">
            {current.phrase} registraste {countLabel(data.count)}
            {data.average_mood !== null && `, con un ánimo promedio de ${formatAverage(data.average_mood)} de 5`}.
          </p>

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Huellas por tipo</h3>
            <SensationBars
              types={data.types}
              selected={selected}
              onSelect={(type) => setSelected((value) => (value === type ? null : type))}
            />
            {detail ? (
              <section aria-labelledby={detailId} className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
                <h4 id={detailId} className="flex items-center gap-2 font-semibold">
                  {createElement(getSensoryIcon(detail.type), { "aria-hidden": true, className: "size-4", strokeWidth: 1.8 })}
                  {detail.label} · {countLabel(detail.count)}
                </h4>
                <p className="text-sm">{observation(detail, data.average_mood)}</p>
                {detail.top_elements.length > 0 && (
                  <ElementList
                    elements={detail.top_elements}
                    labelOf={labelOf}
                    showType={false}
                    label={`Lo que más registras de ${detail.label.toLowerCase()}`}
                  />
                )}
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">Toca un tipo para ver su detalle y el ánimo que lo acompaña.</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Lo que más registras</h3>
            <Recognition data={data} recognizing={state.recognizing} unavailable={state.unavailable} onRetry={retry} />
            {data.top_elements.length > 0 ? (
              <ElementList elements={data.top_elements} labelOf={labelOf} label="Los 5 elementos que más registras" />
            ) : (
              !state.recognizing && (
                <p className="text-sm text-muted-foreground">Aún no reconocemos elementos en tus notas de este periodo.</p>
              )
            )}
            <p className="text-xs text-muted-foreground">
              La IA reconoce el elemento de cada nota, por ejemplo «café» en «El olor del café recién molido». El ánimo combina
              la emoción y su intensidad.
            </p>
          </div>
        </>
      )}
    </GlassCard>
  )
}
