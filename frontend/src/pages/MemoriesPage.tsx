import { ChevronDown, SlidersHorizontal, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"

import { EmotionOrbCluster } from "@/components/evoca/EmotionOrbCluster"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { MemoryGraph, MemoryGraphSkeleton } from "@/components/evoca/MemoryGraph"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useCatalog } from "@/hooks/use-catalog"
import { useMemorySuggestions } from "@/hooks/use-memory-suggestions"
import { memoriesApi, type MemoryGraph as GraphData } from "@/lib/memories"
import { labelOf } from "@/lib/traces"

import { MemoryPanel } from "./memories/MemoryPanel"
import { SuggestionsSection } from "./memories/SuggestionsSection"
import { SensationEmotionFilters } from "./traces/SensationEmotionFilters"

type GraphState = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & GraphData)

const GRAPH_HEIGHT = "h-[clamp(420px,62dvh,720px)]"

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * HU10: mis recuerdos como un grafo de esferas. Cada esfera tiene el color de su emoción y el
 * tamaño de sus huellas; las líneas unen los recuerdos afines. Los filtros atenúan lo que no
 * coincide y, al tocar una esfera, se resaltan sus conexiones y se ven sus huellas.
 * HU9: encima del mapa, las sugerencias de la IA; al aceptar una, aparece en el mapa.
 */
export function MemoriesPage() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { catalog } = useCatalog()
  const type = params.get("tipo")
  const emotion = params.get("emocion")
  const filtered = Boolean(type || emotion)
  const [graph, setGraph] = useState<GraphState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // En el teléfono el mapa es lo primero: los filtros se despliegan a pedido.
  const [showFilterPanel, setShowFilterPanel] = useState(filtered)
  const panel = useRef<HTMLDivElement>(null)
  // Aceptar o descartar una sugerencia cambia el mapa: se vuelve a pedir.
  const suggestions = useMemorySuggestions(user?.id, () => setAttempt((value) => value + 1))
  const hasSuggestions = suggestions.state.status === "ready" && suggestions.state.summary.suggestions.length > 0

  // Al filtrar se conserva el grafo actual hasta que llega el nuevo: el mapa no parpadea ni
  // pierde su disposición.
  useEffect(() => {
    const run = { cancelled: false }
    memoriesApi
      .graph({ sensory_type: type, emotion })
      .then((data) => {
        if (!run.cancelled) setGraph({ status: "ready", ...data })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setGraph({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [type, emotion, attempt])

  useEffect(() => {
    if (selectedId) panel.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" })
  }, [selectedId])

  const setFilter = (name: "tipo" | "emocion", value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    // Otro filtro, otras conexiones: la esfera elegida antes ya no sirve de referencia.
    setSelectedId(null)
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSelectedId(null)
    setParams(new URLSearchParams(), { replace: true })
  }

  const emotionLabel = (value: string) => labelOf(catalog?.emotions ?? [], value)
  // Los filtros se ocultan solo cuando ya se sabe que no hay recuerdos (y si falló la carga).
  const showFilters = graph.status === "loading" || (graph.status === "ready" && graph.total > 0)
  const selected = graph.status === "ready" ? graph.nodes.find((node) => node.id === selectedId) : undefined

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6 lg:max-w-4xl">
      <header className="flex flex-col gap-2 self-start rounded-2xl bg-background/75 px-3 py-2 backdrop-blur-md">
        <h1 className="text-3xl font-semibold">Recuerdos</h1>
        <p className="text-base text-muted-foreground">
          Cada esfera es un recuerdo: su color es la emoción que más sentiste y su tamaño, cuántas huellas guarda. Las
          líneas unen los recuerdos que se parecen.
        </p>
      </header>

      <SuggestionsSection suggestions={suggestions} catalog={catalog} />

      {catalog && showFilters && (
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            aria-expanded={showFilterPanel}
            aria-controls="filtros-recuerdos"
            className="h-11 self-start rounded-full bg-card/90 px-5 backdrop-blur-md"
            onClick={() => setShowFilterPanel((value) => !value)}
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtrar por sensación o emoción
            {filtered && (
              <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
                {Number(Boolean(type)) + Number(Boolean(emotion))}
              </span>
            )}
            <ChevronDown aria-hidden="true" className={showFilterPanel ? "rotate-180 transition-transform" : "transition-transform"} />
          </Button>
          {showFilterPanel && (
            <div id="filtros-recuerdos">
              <SensationEmotionFilters
                catalog={catalog}
                sensoryType={type}
                emotion={emotion}
                onChange={setFilter}
                sensoryLabel="Sensación"
              />
            </div>
          )}
        </div>
      )}

      {graph.status === "loading" && <MemoryGraphSkeleton className={GRAPH_HEIGHT} />}

      {graph.status === "error" && (
        <GlassCard>
          <EmptyState
            variant="error"
            title="No pudimos cargar tus recuerdos"
            description={graph.message}
            action={
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => {
                  setGraph({ status: "loading" })
                  setAttempt((value) => value + 1)
                }}
              >
                Reintentar
              </Button>
            }
          />
        </GlassCard>
      )}

      {graph.status === "ready" && graph.total === 0 && (
        <GlassCard>
          <EmptyState
            visual={<EmotionOrbCluster size={140} />}
            title="Aún no tienes recuerdos"
            description={
              hasSuggestions
                ? "Acepta una sugerencia de arriba y aparecerá aquí como una esfera de color."
                : "Cuando tus huellas se agrupen en recuerdos, aparecerán aquí como esferas de color."
            }
            action={
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link to="/nueva-huella">Registrar una huella</Link>
              </Button>
            }
          />
        </GlassCard>
      )}

      {graph.status === "ready" && graph.total > 0 && (
        <section aria-labelledby="esferas" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/75 px-3 py-1 backdrop-blur-md">
            <h2 id="esferas" className="text-base font-semibold">
              {filtered
                ? `${graph.count} de ${plural(graph.total, "recuerdo", "recuerdos")} ${graph.count === 1 ? "coincide" : "coinciden"}`
                : plural(graph.total, "recuerdo", "recuerdos")}
              {" · "}
              {plural(graph.edges.length, "conexión", "conexiones")}
            </h2>
            {filtered && (
              <Button variant="ghost" className="h-11 rounded-full px-3" onClick={clearFilters}>
                <X aria-hidden="true" />
                Quitar filtros
              </Button>
            )}
          </div>

          {graph.count === 0 && (
            <p role="status" className="rounded-2xl bg-background/80 px-4 py-3 text-sm backdrop-blur-md">
              <span className="font-semibold">Ningún recuerdo coincide.</span> Prueba con otra sensación u otra emoción.
            </p>
          )}

          <MemoryGraph
            nodes={graph.nodes}
            edges={graph.edges}
            emotionLabel={emotionLabel}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className={GRAPH_HEIGHT}
          />
          <p id="mapa-ayuda" className="rounded-2xl bg-background/70 px-3 py-2 text-sm text-muted-foreground backdrop-blur-md">
            Las líneas unen recuerdos afines: cuanto más marcadas, más se parecen. Toca una línea para ver por qué. Arrastra
            para moverte, pellizca o usa Ctrl + rueda para acercar, y arrastra una esfera para acomodarla.
          </p>
        </section>
      )}

      {graph.status === "ready" && selected && (
        <div ref={panel} className="scroll-mt-4">
          <MemoryPanel memory={selected} nodes={graph.nodes} edges={graph.edges} catalog={catalog} onSelect={setSelectedId} />
        </div>
      )}
    </PageTransition>
  )
}
