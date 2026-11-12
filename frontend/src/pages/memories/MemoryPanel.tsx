import { Link2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { EmotionOrb } from "@/components/evoca/EmotionOrb"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { TraceCard, TraceCardSkeleton } from "@/components/evoca/TraceCard"
import { Button } from "@/components/ui/button"
import { isEmotionSlug } from "@/lib/emotions"
import { affinityPercent, connectionsOf, memoriesApi, type MemoryDetail, type MemoryEdge, type MemoryNode } from "@/lib/memories"
import { labelOf, type TraceCatalog } from "@/lib/traces"

type DetailState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; memory: MemoryDetail }

const LOADING: DetailState = { status: "loading" }

export interface MemoryPanelProps {
  memory: MemoryNode
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  catalog: TraceCatalog | null
  onSelect: (id: string | null) => void
}

/**
 * Lo que se ve al tocar una esfera (HU10 · escenario 2): sus conexiones con el motivo de
 * cada una y sus huellas, de la más reciente a la más antigua. No tapa el mapa, que sigue
 * resaltando las conexiones del recuerdo elegido.
 */
export function MemoryPanel({ memory, nodes, edges, catalog, onSelect }: MemoryPanelProps) {
  const navigate = useNavigate()
  // El resultado se guarda junto al id: al elegir otra esfera se ve «cargando» sin reiniciar el estado.
  const [loaded, setLoaded] = useState<{ id: string; state: DetailState } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const detail = loaded && loaded.id === memory.id ? loaded.state : LOADING

  useEffect(() => {
    const id = memory.id
    const run = { cancelled: false }
    memoriesApi
      .get(id)
      .then((value) => {
        if (!run.cancelled) setLoaded({ id, state: { status: "ready", memory: value } })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setLoaded({ id, state: { status: "error", message: error.message } })
      })
    return () => {
      run.cancelled = true
    }
  }, [memory.id, attempt])

  const emotions = catalog?.emotions ?? []
  const sensoryTypes = catalog?.sensory_types ?? []
  const names = new Map(nodes.map((node) => [node.id, node]))
  const connections = connectionsOf(memory.id, edges)

  return (
    <GlassCard as="section" aria-labelledby="recuerdo-elegido" className="flex flex-col gap-5 p-5">
      <header className="flex items-start gap-3">
        {isEmotionSlug(memory.emotion) && <EmotionOrb emotion={memory.emotion} size={72} decorative priority />}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 id="recuerdo-elegido" className="font-display text-2xl leading-tight font-semibold">
            {memory.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <EmotionChip emotion={memory.emotion} label={labelOf(emotions, memory.emotion)} size="sm" />
            <span>
              {memory.trace_count} {memory.trace_count === 1 ? "huella" : "huellas"}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Cerrar el recuerdo" onClick={() => onSelect(null)}>
          <X aria-hidden="true" />
        </Button>
      </header>

      <p className="text-base text-foreground/80">{memory.explanation || "Huellas que guardas juntas en este recuerdo."}</p>

      <section aria-labelledby="conexiones" className="flex flex-col gap-2">
        <h3 id="conexiones" className="inline-flex items-center gap-2 text-base font-semibold">
          <Link2 aria-hidden="true" className="size-4" />
          Conexiones
        </h3>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {memory.match
              ? "Este recuerdo aún no se conecta con otros: no comparte suficientes sensaciones, emoción ni etiquetas."
              : "Este recuerdo no coincide con los filtros: sus conexiones aparecen al quitarlos."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {connections.map(({ edge, other }) => (
              <li key={other}>
                <button
                  type="button"
                  onClick={() => onSelect(other)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-2xl border bg-card px-4 py-2.5 text-left transition-colors hover:border-ring focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="font-semibold">{names.get(other)?.name ?? "Recuerdo"}</span>
                  <span className="text-sm text-muted-foreground">
                    {edge.reason} · afinidad {affinityPercent(edge.score)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="huellas-del-recuerdo" className="flex flex-col gap-3">
        <h3 id="huellas-del-recuerdo" className="text-base font-semibold">
          Huellas
        </h3>
        {detail.status === "loading" && (
          <div className="flex flex-col gap-3" role="status" aria-label="Cargando las huellas del recuerdo">
            <TraceCardSkeleton />
            <TraceCardSkeleton />
          </div>
        )}
        {detail.status === "error" && (
          <EmptyState
            compact
            variant="error"
            title="No pudimos abrir este recuerdo"
            description={detail.message}
            action={
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => {
                  setLoaded(null)
                  setAttempt((value) => value + 1)
                }}
              >
                Reintentar
              </Button>
            }
          />
        )}
        {detail.status === "ready" && (
          <ul className="flex flex-col gap-3" aria-label={`Huellas de ${memory.name}`}>
            {detail.memory.traces.map((trace) => (
              <li key={trace.id}>
                <TraceCard
                  trace={trace}
                  sensoryLabel={labelOf(sensoryTypes, trace.sensory_type)}
                  emotionLabel={labelOf(emotions, trace.emotion)}
                  onOpen={() => navigate(`/mis-huellas/${trace.id}`)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </GlassCard>
  )
}
