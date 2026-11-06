import { motion } from "motion/react"
import { createElement } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual } from "@/lib/emotions"
import { formatRelative } from "@/lib/format"
import { spring } from "@/lib/motion"
import { getSensoryIcon } from "@/lib/sensory"
import type { Trace } from "@/lib/types"
import { cn } from "@/lib/utils"

import { EmotionChip } from "./EmotionChip"

export interface TraceCardProps {
  trace: Trace
  sensoryLabel: string
  emotionLabel: string
  /** Al tocar la tarjeta (por ejemplo, para abrir el detalle). */
  onOpen?: (trace: Trace) => void
  now?: Date
  className?: string
}

/** Tarjeta de una huella: tipo sensorial, nota, emoción, intensidad, etiquetas y fecha. */
export function TraceCard({ trace, sensoryLabel, emotionLabel, onOpen, now, className }: TraceCardProps) {
  const reduced = useReducedMotion()
  const visual = getEmotionVisual(trace.emotion)
  const when = trace.happened_at ?? trace.created_at
  const interactive = Boolean(onOpen)

  const body = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-3 left-0 w-1.5 rounded-r-full"
        style={{ background: visual.color }}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary text-foreground">
            {createElement(getSensoryIcon(trace.sensory_type), {
              "aria-hidden": true,
              className: "size-5",
              strokeWidth: 1.8,
            })}
          </span>
          {sensoryLabel}
        </span>
        <time dateTime={when} className="pt-2 text-xs text-muted-foreground">
          {formatRelative(when, now)}
        </time>
      </div>
      <p className="line-clamp-3 text-left font-display text-lg leading-snug text-card-foreground">
        {trace.note}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <EmotionChip emotion={trace.emotion} label={emotionLabel} size="sm" />
        <span
          className="inline-flex items-center gap-1"
          role="img"
          aria-label={`Intensidad ${trace.mood_intensity} de 5`}
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <span
              key={level}
              className="size-2 rounded-full"
              style={{
                background: level <= trace.mood_intensity ? visual.color : "var(--border)",
              }}
            />
          ))}
        </span>
      </div>
      {trace.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
          {trace.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              #{tag}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  const classes = cn(
    "relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 pl-5 text-left shadow-soft",
    interactive &&
      "transition-shadow duration-200 hover:shadow-lifted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
    className,
  )

  if (!interactive) return <article className={classes}>{body}</article>

  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(trace)}
      aria-label={`${sensoryLabel}, ${emotionLabel}: ${trace.note}`}
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      transition={spring}
      className={classes}
    >
      {body}
    </motion.button>
  )
}

/** Marcador de carga con la misma forma que la tarjeta. */
export function TraceCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft", className)}
    >
      <div className="flex items-center gap-2">
        <div className="size-9 animate-pulse rounded-xl bg-secondary" />
        <div className="h-3 w-20 animate-pulse rounded-full bg-secondary" />
      </div>
      <div className="h-4 w-full animate-pulse rounded-full bg-secondary" />
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-secondary" />
      <div className="h-7 w-28 animate-pulse rounded-full bg-secondary" />
    </div>
  )
}
