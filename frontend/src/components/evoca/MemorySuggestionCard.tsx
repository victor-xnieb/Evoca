import { Check, Pencil, Sparkles, Trash2, Unlink } from "lucide-react"
import { createElement, useEffect, useId, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isEmotionSlug } from "@/lib/emotions"
import type { MemorySuggestion } from "@/lib/memories"
import { getSensoryIcon } from "@/lib/sensory"
import type { Trace } from "@/lib/types"
import { cn } from "@/lib/utils"

import { EmotionChip } from "./EmotionChip"
import { EmotionOrb } from "./EmotionOrb"
import { GlassCard } from "./GlassCard"

export interface MemorySuggestionCardProps {
  suggestion: MemorySuggestion
  sensoryLabel: (value: string) => string
  emotionLabel: (value: string) => string
  /** Hay una acción en curso con esta sugerencia: los botones se desactivan. */
  busy?: boolean
  /** Error de la última acción, para mostrarlo bajo los botones. */
  error?: string | null
  onAccept: () => void
  onRename: (name: string) => void
  onRemoveTrace: (trace: Trace) => void
  onDiscard: () => void
  onOpenTrace?: (trace: Trace) => void
  className?: string
}

const plural = (count: number) => `${count} ${count === 1 ? "huella" : "huellas"}`

/**
 * Un recuerdo que propuso la IA (HU9 · escenario 2): dice por qué agrupó esas huellas y deja
 * aceptarlo, renombrarlo, separar huellas o descartarlo. Nada se guarda en el mapa hasta que
 * la persona lo acepta.
 */
export function MemorySuggestionCard({
  suggestion,
  sensoryLabel,
  emotionLabel,
  busy = false,
  error,
  onAccept,
  onRename,
  onRemoveTrace,
  onDiscard,
  onOpenTrace,
  className,
}: MemorySuggestionCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(suggestion.name)
  const headingId = useId()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const single = suggestion.traces.length <= 1

  // Al abrir el campo del nombre, el foco va directo a él.
  useEffect(() => {
    if (editing) input.current?.focus()
  }, [editing])

  const startEditing = () => {
    setDraft(suggestion.name)
    setEditing(true)
  }

  const submitName = (event: FormEvent) => {
    event.preventDefault()
    const name = draft.trim()
    if (!name || name === suggestion.name) {
      setEditing(false)
      return
    }
    onRename(name)
    setEditing(false)
  }

  return (
    <GlassCard
      as="article"
      aria-labelledby={headingId}
      data-testid="memory-suggestion"
      className={cn("flex flex-col gap-4 p-5", className)}
    >
      <p className="inline-flex items-center gap-2 self-start rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
        <Sparkles aria-hidden="true" className="size-3.5" />
        Sugerencia de la IA
      </p>

      <header className="flex items-start gap-3">
        {isEmotionSlug(suggestion.emotion) && <EmotionOrb emotion={suggestion.emotion} size={64} decorative />}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {editing ? (
            <form onSubmit={submitName} className="flex flex-col gap-2" aria-label="Renombrar el recuerdo">
              <label htmlFor={inputId} className="text-sm font-semibold text-muted-foreground">
                Nuevo nombre
              </label>
              <Input
                id={inputId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={120}
                ref={input}
                className="h-11 rounded-xl text-base"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="h-10 rounded-full px-4" disabled={busy || !draft.trim()}>
                  Guardar nombre
                </Button>
                <Button type="button" variant="ghost" className="h-10 rounded-full px-4" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <h3 id={headingId} className="font-display text-2xl leading-tight font-semibold">
              {suggestion.name}
            </h3>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <EmotionChip emotion={suggestion.emotion} label={emotionLabel(suggestion.emotion)} size="sm" />
            <span>{plural(suggestion.traces.length)}</span>
          </div>
        </div>
      </header>

      <p className="text-base text-foreground/85">
        <span className="font-semibold">Por qué van juntas: </span>
        {suggestion.explanation}
      </p>

      <ul className="flex flex-col gap-2" aria-label={`Huellas de ${suggestion.name}`}>
        {suggestion.traces.map((trace) => (
          <li key={trace.id} className="flex items-start gap-2 rounded-2xl border bg-card/80 py-2 pr-2 pl-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
              {createElement(getSensoryIcon(trace.sensory_type), { "aria-hidden": true, className: "size-4", strokeWidth: 1.8 })}
            </span>
            <button
              type="button"
              className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => onOpenTrace?.(trace)}
              disabled={!onOpenTrace}
            >
              <span className="line-clamp-2 text-sm leading-snug">{trace.note}</span>
              <span className="text-xs text-muted-foreground">
                {sensoryLabel(trace.sensory_type)} · {emotionLabel(trace.emotion)} · intensidad {trace.mood_intensity}
              </span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 rounded-full px-3"
              aria-label={`Quitar «${trace.note.slice(0, 40)}» de este recuerdo`}
              title={single ? "Es la única huella: para quitarla, descarta la sugerencia." : "Quitar de este recuerdo"}
              disabled={busy || single}
              onClick={() => onRemoveTrace(trace)}
            >
              <Unlink aria-hidden="true" className="size-4" />
              Quitar
            </Button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-11 rounded-full px-5" disabled={busy || editing} onClick={onAccept}>
          <Check aria-hidden="true" />
          Aceptar recuerdo
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full px-4" disabled={busy || editing} onClick={startEditing}>
          <Pencil aria-hidden="true" />
          Renombrar
        </Button>
        <Button type="button" variant="ghost" className="h-11 rounded-full px-4 text-muted-foreground" disabled={busy || editing} onClick={onDiscard}>
          <Trash2 aria-hidden="true" />
          Descartar
        </Button>
        {busy && (
          <span role="status" className="self-center text-sm text-muted-foreground">
            Guardando…
          </span>
        )}
      </div>
    </GlassCard>
  )
}
