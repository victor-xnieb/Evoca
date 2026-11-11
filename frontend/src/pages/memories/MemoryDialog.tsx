import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { EmotionOrb } from "@/components/evoca/EmotionOrb"
import { EmptyState } from "@/components/evoca/EmptyState"
import { TraceCard, TraceCardSkeleton } from "@/components/evoca/TraceCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { isEmotionSlug } from "@/lib/emotions"
import { memoriesApi, type MemoryDetail, type MemorySphere } from "@/lib/memories"
import type { TraceCatalog } from "@/lib/traces"
import { labelOf } from "@/lib/traces"

type DetailState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; memory: MemoryDetail }

const LOADING: DetailState = { status: "loading" }

export interface MemoryDialogProps {
  /** Recuerdo tocado en el mapa; null cierra el diálogo. */
  memory: MemorySphere | null
  catalog: TraceCatalog | null
  onClose: () => void
}

/** Las huellas de un recuerdo al tocar su esfera (HU10 · escenario 2). */
export function MemoryDialog({ memory, catalog, onClose }: MemoryDialogProps) {
  const navigate = useNavigate()
  // El resultado se guarda junto al id: al tocar otra esfera se ve «cargando» sin reiniciar el estado.
  const [loaded, setLoaded] = useState<{ id: string; state: DetailState } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const id = memory?.id
  const detail = loaded && loaded.id === id ? loaded.state : LOADING

  useEffect(() => {
    if (!id) return
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
  }, [id, attempt])

  const emotions = catalog?.emotions ?? []
  const sensoryTypes = catalog?.sensory_types ?? []

  return (
    <Dialog open={Boolean(memory)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[85dvh] flex-col gap-4 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        {memory && (
          <>
            <DialogHeader className="flex-row items-center gap-3 px-5 pt-5">
              {isEmotionSlug(memory.emotion) && <EmotionOrb emotion={memory.emotion} size={72} decorative priority />}
              <div className="flex min-w-0 flex-col gap-1.5 text-left">
                <DialogTitle className="font-display text-2xl leading-tight font-semibold">{memory.name}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <EmotionChip emotion={memory.emotion} label={labelOf(emotions, memory.emotion)} size="sm" />
                  <span>
                    {memory.trace_count} {memory.trace_count === 1 ? "huella" : "huellas"}
                  </span>
                </div>
              </div>
            </DialogHeader>
            <DialogDescription className="px-5 text-base text-foreground/80">
              {memory.explanation || "Huellas que guardas juntas en este recuerdo."}
            </DialogDescription>

            <div className="flex-1 overflow-y-auto px-5 pb-2">
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
                    <Button className="h-11 rounded-full px-5" onClick={() => {
                        setLoaded(null)
                        setAttempt((value) => value + 1)
                      }}>
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
            </div>

            <div className="flex justify-end border-t bg-muted/40 px-5 py-3">
              <DialogClose asChild>
                <Button variant="ghost" className="h-11 rounded-full px-5">
                  Cerrar
                </Button>
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
