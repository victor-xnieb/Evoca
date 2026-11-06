import { motion } from "motion/react"
import type { CSSProperties } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual } from "@/lib/emotions"
import { formatAverage, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface DayCellProps {
  date: Date
  /** Emoción dominante del día; null o undefined si no hay registros. */
  emotion?: string | null
  emotionLabel?: string
  averageIntensity?: number | null
  selected?: boolean
  isToday?: boolean
  /** Días de relleno de otros meses en la cuadrícula. */
  outsideMonth?: boolean
  /** Posición en la cuadrícula (fila y columna) para la entrada en «olas» de color. */
  wave?: { row: number; column: number }
  onSelect?: (date: Date) => void
}

/**
 * Día del calendario de ánimo. Con registros toma el color de la emoción dominante y
 * muestra su ícono; sin registros es beige neutro, sin señales de alerta.
 */
export function DayCell({
  date,
  emotion,
  emotionLabel,
  averageIntensity,
  selected = false,
  isToday = false,
  outsideMonth = false,
  wave,
  onSelect,
}: DayCellProps) {
  const reduced = useReducedMotion()
  const hasRecord = Boolean(emotion)
  const visual = hasRecord ? getEmotionVisual(emotion as string) : null
  const Icon = visual?.icon
  const style = {
    "--day-color": visual?.color ?? "var(--evoca-day-empty)",
    "--day-ink": visual?.ink ?? "var(--evoca-day-empty-ink)",
  } as CSSProperties

  const dayName = formatDate(date, { weekday: "long", day: "numeric", month: "long" })
  const description = hasRecord
    ? `${dayName}: ${emotionLabel ?? emotion}${
        averageIntensity ? `, intensidad promedio ${formatAverage(averageIntensity)}` : ""
      }`
    : `${dayName}: sin registros`

  const delay = wave ? (wave.row + wave.column) * 0.035 : 0

  return (
    <motion.button
      type="button"
      style={style}
      aria-label={isToday ? `Hoy, ${description}` : description}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      disabled={!onSelect}
      onClick={() => onSelect?.(date)}
      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: outsideMonth ? 0.4 : 1, scale: 1 }}
      transition={{ delay, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex aspect-square min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-xl",
        "bg-(--day-color) text-(--day-ink) transition-shadow duration-200",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-default",
        selected && "ring-3 ring-foreground ring-offset-2 ring-offset-background",
        isToday && !selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <span className={cn("text-sm leading-none", hasRecord ? "font-bold" : "font-medium")}>
        {date.getDate()}
      </span>
      {Icon && <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.4} />}
    </motion.button>
  )
}
