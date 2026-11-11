import { ChevronDown, SlidersHorizontal, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

import { EmotionOrbCluster } from "@/components/evoca/EmotionOrbCluster"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { MemoryMap, MemoryMapSkeleton } from "@/components/evoca/MemoryMap"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/hooks/use-catalog"
import { memoriesApi, type MemoryMap as MapData, type MemorySphere } from "@/lib/memories"
import { labelOf } from "@/lib/traces"

import { MemoryDialog } from "./memories/MemoryDialog"
import { SensationEmotionFilters } from "./traces/SensationEmotionFilters"

type MapState = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & MapData)

/**
 * HU10: mis recuerdos como esferas del color de su emoción, sin orden cronológico. Se
 * filtran por sensación o emoción, y al tocar una esfera se ven sus huellas.
 */
export function MemoriesPage() {
  const [params, setParams] = useSearchParams()
  const { catalog } = useCatalog()
  const type = params.get("tipo")
  const emotion = params.get("emocion")
  const filtered = Boolean(type || emotion)
  const [map, setMap] = useState<MapState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState<MemorySphere | null>(null)
  // En el teléfono el mapa es lo primero: los filtros se despliegan a pedido.
  const [showFilterPanel, setShowFilterPanel] = useState(filtered)

  useEffect(() => {
    const run = { cancelled: false }
    memoriesApi
      .map({ sensory_type: type, emotion })
      .then((data) => {
        if (!run.cancelled) setMap({ status: "ready", ...data })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setMap({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [type, emotion, attempt])

  const setFilter = (name: "tipo" | "emocion", value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setMap({ status: "loading" })
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    setMap({ status: "loading" })
    setParams(new URLSearchParams(), { replace: true })
  }

  const emotionLabel = (value: string) => labelOf(catalog?.emotions ?? [], value)
  // Los filtros se ocultan solo cuando ya se sabe que no hay recuerdos (y si falló la carga).
  const showFilters = map.status === "loading" || (map.status === "ready" && map.total > 0)

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6 lg:max-w-4xl">
      <header className="flex flex-col gap-2 self-start rounded-2xl bg-background/75 px-3 py-2 backdrop-blur-md">
        <h1 className="text-3xl font-semibold">Recuerdos</h1>
        <p className="text-base text-muted-foreground">
          Cada esfera es un recuerdo: su color es la emoción que más sentiste y su tamaño, cuántas huellas guarda.
        </p>
      </header>

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
            {filtered && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{Number(Boolean(type)) + Number(Boolean(emotion))}</span>}
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

      {map.status === "loading" && <MemoryMapSkeleton />}

      {map.status === "error" && (
        <GlassCard>
          <EmptyState
            variant="error"
            title="No pudimos cargar tus recuerdos"
            description={map.message}
            action={
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => {
                  setMap({ status: "loading" })
                  setAttempt((value) => value + 1)
                }}
              >
                Reintentar
              </Button>
            }
          />
        </GlassCard>
      )}

      {map.status === "ready" && map.total === 0 && (
        <GlassCard>
          <EmptyState
            visual={<EmotionOrbCluster size={140} />}
            title="Aún no tienes recuerdos"
            description="Cuando tus huellas se agrupen en recuerdos, aparecerán aquí como esferas de color."
            action={
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link to="/nueva-huella">Registrar una huella</Link>
              </Button>
            }
          />
        </GlassCard>
      )}

      {map.status === "ready" && map.total > 0 && map.count === 0 && (
        <GlassCard>
          <EmptyState
            compact
            illustration="bloom"
            title="Ningún recuerdo coincide"
            description="Prueba con otra sensación u otra emoción."
            action={
              <Button variant="outline" className="h-11 rounded-full px-5" onClick={clearFilters}>
                <X aria-hidden="true" />
                Quitar filtros
              </Button>
            }
          />
        </GlassCard>
      )}

      {map.status === "ready" && map.count > 0 && (
        <section aria-labelledby="esferas" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/75 px-3 py-1 backdrop-blur-md">
            <h2 id="esferas" className="text-base font-semibold">
              {map.count} {map.count === 1 ? "recuerdo" : "recuerdos"}
              {filtered && " con estos filtros"}
            </h2>
            {filtered && (
              <Button variant="ghost" className="h-11 rounded-full px-3" onClick={clearFilters}>
                <X aria-hidden="true" />
                Quitar filtros
              </Button>
            )}
          </div>
          <MemoryMap memories={map.results} emotionLabel={emotionLabel} onOpen={setOpen} />
        </section>
      )}

      <MemoryDialog memory={open} catalog={catalog} onClose={() => setOpen(null)} />
    </PageTransition>
  )
}
