import { Check, Map as MapIcon, Pencil, Sparkles, X } from "lucide-react"
import { createElement, useId, useState } from "react"
import { Link } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { EvokedMemory, EvokeStatus } from "@/lib/diary"
import { getEmotionVisual } from "@/lib/emotions"
import { getSensoryIcon } from "@/lib/sensory"
import { labelOf, type TraceCatalog } from "@/lib/traces"
import { cn } from "@/lib/utils"

const MESSAGES: Record<Exclude<EvokeStatus, "ok">, string> = {
  too_short: "Escribe un poco más para que la IA encuentre tus aromas, canciones o lugares.",
  risk: "Esta página no se envía a la IA. Si lo necesitas, las líneas de ayuda están en «Ayuda».",
  unavailable: "No pudimos evocar recuerdos ahora. Tu página está guardada; inténtalo en un momento.",
}

export interface EvocationPanelProps {
  memories: EvokedMemory[]
  status: EvokeStatus | null
  catalog: TraceCatalog | null
  onAccept: (index: number, changes: { name?: string; traces: number[] }) => Promise<void>
  onDiscard: (index: number) => Promise<void>
}

function Suggestion({
  memory,
  catalog,
  onAccept,
  onDiscard,
}: {
  memory: EvokedMemory
  catalog: TraceCatalog | null
  onAccept: EvocationPanelProps["onAccept"]
  onDiscard: EvocationPanelProps["onDiscard"]
}) {
  const [name, setName] = useState(memory.name)
  const nameId = useId()
  const [renaming, setRenaming] = useState(false)
  const [kept, setKept] = useState(() => memory.traces.map((trace) => trace.index))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emotions = catalog?.emotions ?? []
  const sensations = catalog?.sensory_types ?? []
  // Color de la esfera: la emoción que más se repite entre sus huellas.
  const counts = new Map<string, number>()
  for (const trace of memory.traces) counts.set(trace.emotion, (counts.get(trace.emotion) ?? 0) + 1)
  const emotion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "calma"
  const accepted = memory.status === "accepted"

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-3xl border-2 bg-card p-4",
        accepted ? "border-solid" : "border-dashed",
      )}
      style={{ borderColor: getEmotionVisual(emotion).color }}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={cn("mt-1 size-9 shrink-0 rounded-full", !accepted && "outline-2 outline-offset-2 outline-dashed")} style={{ background: getEmotionVisual(emotion).color, outlineColor: getEmotionVisual(emotion).color }} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {renaming ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={nameId} className="text-sm font-semibold">
                Nombre del recuerdo
              </label>
              <Input id={nameId} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} className="h-10" />
            </div>
          ) : (
            <h4 className="font-display text-lg leading-tight font-semibold">{name}</h4>
          )}
          <p className="text-sm text-muted-foreground">{memory.explanation}</p>
          <span className="text-xs font-semibold">{accepted ? "Recuerdo aceptado" : "Recuerdo sugerido"}</span>
        </div>
      </div>

      <ul aria-label={`Huellas de ${name}`} className="flex flex-col gap-1.5">
        {memory.traces.map((trace) => {
          const on = kept.includes(trace.index)
          return (
            <li key={trace.index} className={cn("flex items-start gap-2 rounded-2xl bg-secondary/60 px-3 py-2 text-sm", !on && "opacity-50")}>
              {createElement(getSensoryIcon(trace.sensory_type), { "aria-hidden": true, className: "mt-0.5 size-4 shrink-0", strokeWidth: 1.8 })}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span>{trace.note}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {labelOf(sensations, trace.sensory_type)} ·
                  <EmotionChip emotion={trace.emotion} label={labelOf(emotions, trace.emotion)} size="sm" />
                  intensidad {trace.intensity} de 5
                </span>
              </span>
              {!accepted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={!on}
                  onClick={() => setKept((value) => (on ? value.filter((index) => index !== trace.index) : [...value, trace.index]))}
                >
                  {on ? "Quitar" : "Volver a poner"}
                  <span className="sr-only">: {trace.note}</span>
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {accepted ? (
        <Button asChild variant="outline" className="h-11 self-start rounded-full px-4">
          <Link to={`/recuerdos?recuerdo=${memory.memory_id}`}>
            <MapIcon aria-hidden="true" />
            Ver en el mapa
          </Link>
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 rounded-full px-5"
            disabled={busy || kept.length === 0 || !name.trim()}
            onClick={() => void run(() => onAccept(memory.index, { name: name.trim() !== memory.name ? name.trim() : undefined, traces: kept }))}
          >
            <Check aria-hidden="true" />
            Aceptar
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-full px-4" disabled={busy} onClick={() => setRenaming((value) => !value)}>
            <Pencil aria-hidden="true" />
            {renaming ? "Listo" : "Renombrar"}
          </Button>
          <Button type="button" variant="ghost" className="h-11 rounded-full px-4" disabled={busy} onClick={() => void run(() => onDiscard(memory.index))}>
            <X aria-hidden="true" />
            Descartar
          </Button>
        </div>
      )}
      {kept.length === 0 && !accepted && <p className="text-xs text-muted-foreground">Deja al menos una huella para aceptarlo.</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </li>
  )
}

/**
 * HU18: lo que la IA evocó de la página. Cada recuerdo sugerido (borde punteado) se puede
 * aceptar, renombrar, quitarle huellas o descartar; solo lo aceptado se guarda y aparece en el
 * mapa. Siempre manda la persona.
 */
export function EvocationPanel({ memories, status, catalog, onAccept, onDiscard }: EvocationPanelProps) {
  const visible = memories.filter((memory) => memory.status !== "discarded")
  if (!visible.length && (!status || status === "ok")) return null
  return (
    <section aria-labelledby="evocados" className="flex flex-col gap-3 rounded-3xl bg-background/80 p-4 backdrop-blur-md">
      <h3 id="evocados" className="inline-flex items-center gap-2 text-lg font-semibold">
        <Sparkles aria-hidden="true" className="size-5" />
        Recuerdos evocados de esta página
      </h3>
      {status && status !== "ok" && (
        <p role="status" className="text-sm">
          {MESSAGES[status]}
        </p>
      )}
      {visible.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            La IA los propone a partir de lo que escribiste. Solo se guarda lo que aceptes; tu elección siempre manda.
          </p>
          <ul className="flex flex-col gap-3">
            {visible.map((memory) => (
              <Suggestion key={`${memory.index}-${memory.status}`} memory={memory} catalog={catalog} onAccept={onAccept} onDiscard={onDiscard} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
