import { motion } from "motion/react"
import { useId, useRef, type CSSProperties, type KeyboardEvent } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual } from "@/lib/emotions"
import { spring } from "@/lib/motion"
import { cn } from "@/lib/utils"

const INTENSITY_LABELS = ["Muy baja", "Baja", "Media", "Alta", "Muy alta"] as const

export interface IntensityPickerProps {
  value: number | null
  onChange: (value: number) => void
  /** Emoción elegida: tiñe el nivel seleccionado con su color. */
  emotion?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Selector de intensidad de 1 a 5 (radiogroup accesible con flechas). El nivel elegido
 * «late» suavemente para confirmar la elección; con movimiento reducido queda quieto.
 */
export function IntensityPicker({
  value,
  onChange,
  emotion,
  label = "¿Qué tan intenso fue?",
  error,
  disabled = false,
  className,
}: IntensityPickerProps) {
  const reduced = useReducedMotion()
  const labelId = useId()
  const errorId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const visual = emotion ? getEmotionVisual(emotion) : null
  const style = {
    "--level-color": visual?.color ?? "var(--primary)",
    "--level-ink": visual?.ink ?? "var(--primary-foreground)",
  } as CSSProperties

  const select = (level: number) => {
    if (disabled) return
    onChange(level)
    buttons.current[level - 1]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, level: number) => {
    const next: Record<string, number> = {
      ArrowRight: Math.min(5, level + 1),
      ArrowUp: Math.min(5, level + 1),
      ArrowLeft: Math.max(1, level - 1),
      ArrowDown: Math.max(1, level - 1),
      Home: 1,
      End: 5,
    }
    if (event.key in next) {
      event.preventDefault()
      select(next[event.key])
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} style={style}>
      <span id={labelId} className="text-base font-semibold">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        aria-disabled={disabled || undefined}
        className="flex items-end justify-between gap-2"
      >
        {INTENSITY_LABELS.map((levelLabel, index) => {
          const level = index + 1
          const checked = value === level
          const focusable = value === null ? level === 1 : checked
          const dotSize = 22 + index * 6
          return (
            <button
              key={level}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${level} de 5, ${levelLabel.toLowerCase()}`}
              tabIndex={focusable ? 0 : -1}
              disabled={disabled}
              onClick={() => select(level)}
              onKeyDown={(event) => onKeyDown(event, level)}
              className={cn(
                "group flex min-h-16 min-w-11 flex-1 flex-col items-center justify-end gap-1.5 rounded-2xl pb-1",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
            >
              <motion.span
                aria-hidden="true"
                className={cn(
                  "grid place-items-center rounded-full border-2 text-sm font-bold transition-colors duration-200",
                  checked
                    ? "border-(--level-color) bg-(--level-color) text-(--level-ink) shadow-soft"
                    : value !== null && level < value
                      ? "border-(--level-color) bg-[color-mix(in_oklab,var(--level-color)_30%,var(--card))]"
                      : "border-input bg-card group-hover:border-(--level-color)",
                )}
                style={{ width: dotSize, height: dotSize }}
                animate={
                  checked && !reduced
                    ? { scale: [1, 1.14, 1, 1.08, 1] }
                    : { scale: 1 }
                }
                transition={
                  checked && !reduced
                    ? { duration: 1.1, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }
                    : spring
                }
              >
                {level}
              </motion.span>
              <span
                className={cn(
                  "text-xs leading-tight text-muted-foreground",
                  checked && "font-semibold text-foreground",
                )}
              >
                {levelLabel}
              </span>
            </button>
          )
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
