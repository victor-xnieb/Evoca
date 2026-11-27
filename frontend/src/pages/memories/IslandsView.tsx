import { ChevronDown, EyeOff, Eye, Pencil, RefreshCw } from "lucide-react"
import { useId, useState, type FormEvent } from "react"
import { Link } from "react-router"

import { EmotionOrb } from "@/components/evoca/EmotionOrb"
import { EmotionOrbCluster } from "@/components/evoca/EmotionOrbCluster"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIslands } from "@/hooks/use-islands"
import { isEmotionSlug } from "@/lib/emotions"
import type { Island } from "@/lib/islands"

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

interface IslandCardProps {
  island: Island
  onOpenMemory: (id: string) => void
  onChange: (changes: { name?: string; hidden?: boolean }) => Promise<void>
}

function IslandCard({ island, onOpenMemory, onChange }: IslandCardProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(island.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detailId = useId()
  const inputId = useId()

  const save = async (changes: { name?: string; hidden?: boolean }) => {
    setBusy(true)
    setError(null)
    try {
      await onChange(changes)
      setEditing(false)
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save({ name: name.trim() })
  }

  return (
    <li>
      <GlassCard as="article" aria-label={island.name} className="flex flex-col gap-3 p-4 sm:p-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full flex-col gap-2 rounded-2xl text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-display text-xl leading-tight font-semibold">{island.name}</span>
            {island.weight !== null && (
              <span className="shrink-0 text-2xl font-semibold tabular-nums">
                {island.weight} %<span className="sr-only"> de peso</span>
              </span>
            )}
          </span>
          {island.weight !== null && (
            <span aria-hidden="true" className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <span className="block h-full rounded-full bg-(--accent-emotion)" style={{ width: `${island.weight}%` }} />
            </span>
          )}
          <span className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="flex -space-x-2">
                {island.memories.slice(0, 5).map((memory) =>
                  isEmotionSlug(memory.emotion) ? <EmotionOrb key={memory.id} emotion={memory.emotion} size={26} decorative /> : null,
                )}
              </span>
              {plural(island.memories.length, "recuerdo", "recuerdos")} · {plural(island.trace_count, "huella", "huellas")}
            </span>
            <ChevronDown aria-hidden="true" className={open ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"} />
          </span>
        </button>

        {open && (
          <div id={detailId} className="flex flex-col gap-3 border-t pt-3">
            <p className="text-base">
              <span className="font-semibold">Por qué se agruparon: </span>
              {island.explanation || "Recuerdos que la IA vio afines."}
            </p>
            <ul aria-label={`Recuerdos de ${island.name}`} className="flex flex-wrap gap-2">
              {island.memories.map((memory) => (
                <li key={memory.id}>
                  <button
                    type="button"
                    onClick={() => onOpenMemory(memory.id)}
                    className="flex min-h-11 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm font-semibold hover:border-ring focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {isEmotionSlug(memory.emotion) && <EmotionOrb emotion={memory.emotion} size={30} decorative />}
                    {memory.name}
                    <span className="sr-only">: ver en el mapa</span>
                  </button>
                </li>
              ))}
            </ul>

            {editing ? (
              <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
                <div className="flex min-w-48 flex-1 flex-col gap-1">
                  <label htmlFor={inputId} className="text-sm font-semibold">
                    Nombre de la isla
                  </label>
                  <Input id={inputId} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} className="h-11" />
                </div>
                <Button type="submit" className="h-11 rounded-full px-5" disabled={busy || !name.trim()}>
                  Guardar
                </Button>
                <Button type="button" variant="ghost" className="h-11 rounded-full px-4" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!island.hidden && (
                  <Button type="button" variant="outline" className="h-11 rounded-full px-4" disabled={busy} onClick={() => setEditing(true)}>
                    <Pencil aria-hidden="true" />
                    Renombrar
                  </Button>
                )}
                {island.renamed && (
                  <Button type="button" variant="ghost" className="h-11 rounded-full px-4" disabled={busy} onClick={() => void save({ name: "" })}>
                    Volver a «{island.ai_name}»
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-full px-4"
                  disabled={busy}
                  onClick={() => void save({ hidden: !island.hidden })}
                >
                  {island.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                  {island.hidden ? "Mostrar isla" : "Ocultar isla"}
                </Button>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </li>
  )
}

/**
 * HU15: «Mis islas», los grandes temas de mis recuerdos con su peso (la parte de mis huellas que
 * reúnen). Al tocar una se ven sus recuerdos y por qué se agruparon; se puede renombrar u ocultar
 * y el cambio se conserva al volver a calcular.
 */
export function IslandsView({ onOpenMemory }: { onOpenMemory: (id: string) => void }) {
  const { state, retry, recalculate, update } = useIslands()

  if (state.status === "loading") {
    return <div aria-busy="true" aria-label="Cargando tus islas" className="h-64 animate-pulse rounded-3xl bg-secondary/70" />
  }
  if (state.status === "error") {
    return (
      <GlassCard>
        <EmptyState
          variant="error"
          title="No pudimos cargar tus islas"
          description={state.message}
          action={
            <Button className="h-11 rounded-full px-5" onClick={retry}>
              Intentar de nuevo
            </Button>
          }
        />
      </GlassCard>
    )
  }
  if (state.status === "calculating" && (!state.data || state.data.islands.length === 0)) {
    return (
      <GlassCard className="flex flex-col items-center gap-4 p-8 text-center">
        <EmotionOrbCluster size={120} />
        <p role="status" className="text-lg font-semibold">
          La IA está buscando tus islas…
        </p>
        <p className="text-sm text-muted-foreground">Agrupa tus recuerdos en grandes temas. Puede tardar unos segundos.</p>
      </GlassCard>
    )
  }

  const data = state.data!
  const calculating = state.status === "calculating"

  if (data.status === "too_few") {
    return (
      <GlassCard>
        <EmptyState
          visual={<EmotionOrbCluster size={120} />}
          title={`Te ${data.missing === 1 ? "falta 1 recuerdo" : `faltan ${data.missing} recuerdos`} para descubrir tus islas`}
          description={`Con ${data.required} recuerdos en tu mapa, la IA los agrupa en grandes temas y te muestra cuáles pesan más. Llevas ${data.memory_count} de ${data.required}.`}
          action={
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
              <Link to="/nueva-huella">Registrar una huella</Link>
            </Button>
          }
        />
      </GlassCard>
    )
  }

  return (
    <section aria-labelledby="mis-islas" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-2xl bg-background/75 px-3 py-2 backdrop-blur-md">
        <h2 id="mis-islas" className="text-xl font-semibold">
          Mis islas
        </h2>
        <p className="text-sm text-muted-foreground">
          Los grandes temas de tus recuerdos. El porcentaje es la parte de tus huellas que reúne cada isla: las que más pesan
          son las que más te definen.
        </p>
      </div>

      {calculating && (
        <p role="status" className="rounded-2xl bg-background/80 px-4 py-3 text-sm backdrop-blur-md">
          La IA está volviendo a calcular tus islas…
        </p>
      )}
      {!calculating && data.status === "unavailable" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
          <p className="flex-1">No pudimos calcular tus islas ahora. Inténtalo en un momento.</p>
          <Button variant="outline" size="sm" onClick={() => void recalculate()}>
            Intentar de nuevo
          </Button>
        </div>
      )}
      {!calculating && data.status === "ready" && data.outdated && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-support px-4 py-3 text-sm text-support-ink">
          <p className="flex-1">Tus recuerdos cambiaron desde que se calcularon tus islas.</p>
          <Button variant="outline" size="sm" onClick={() => void recalculate()}>
            <RefreshCw aria-hidden="true" />
            Volver a calcular
          </Button>
        </div>
      )}

      {data.islands.length > 0 && (
        <ol aria-label="Islas, de la que más pesa a la que menos" className="flex flex-col gap-3">
          {data.islands.map((island) => (
            <IslandCard key={island.id} island={island} onOpenMemory={onOpenMemory} onChange={(changes) => update(island.id, changes)} />
          ))}
        </ol>
      )}

      {data.hidden.length > 0 && (
        <details className="rounded-2xl bg-background/70 px-4 py-3 backdrop-blur-md">
          <summary className="cursor-pointer text-sm font-semibold">Islas ocultas ({data.hidden.length})</summary>
          <ul aria-label="Islas ocultas" className="mt-3 flex flex-col gap-3">
            {data.hidden.map((island) => (
              <IslandCard key={island.id} island={island} onOpenMemory={onOpenMemory} onChange={(changes) => update(island.id, changes)} />
            ))}
          </ul>
        </details>
      )}

      {data.status === "ready" && !data.outdated && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background/70 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
          <span>
            Las propone la IA a partir de tus recuerdos (sus nombres, emociones, sensaciones y etiquetas, no tus notas). Los
            nombres que cambies y las islas que ocultes se conservan al recalcular.
          </span>
          <Button variant="ghost" size="sm" disabled={calculating} onClick={() => void recalculate()}>
            <RefreshCw aria-hidden="true" />
            Volver a calcular
          </Button>
        </div>
      )}
    </section>
  )
}
