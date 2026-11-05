import { motion } from "motion/react"
import type { CSSProperties } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual } from "@/lib/emotions"
import { spring } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface EmotionChipProps {
  /** Identificador de la emoción (alegria, calma, ...). */
  emotion: string
  /** Etiqueta visible, tal como la entrega la API. */
  label: string
  selected?: boolean
  disabled?: boolean
  size?: "sm" | "md"
  /** Si se pasa, el chip es un botón conmutable; si no, es una etiqueta estática. */
  onSelect?: (emotion: string) => void
  className?: string
}

/**
 * Chip de emoción: color propio + ícono + texto (nunca solo color). Como botón, se
 * «ilumina» al seleccionarlo con un halo de su color.
 */
export function EmotionChip({
  emotion,
  label,
  selected = false,
  disabled = false,
  size = "md",
  onSelect,
  className,
}: EmotionChipProps) {
  const reduced = useReducedMotion()
  const visual = getEmotionVisual(emotion)
  const Icon = visual.icon
  const style = { "--chip-color": visual.color, "--chip-ink": visual.ink } as CSSProperties

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "grid place-items-center rounded-full bg-(--chip-color) text-(--chip-ink)",
          "group-aria-pressed:bg-[color-mix(in_oklab,var(--chip-ink)_16%,transparent)]",
          size === "sm" ? "size-5" : "size-7",
        )}
      >
        <Icon className={size === "sm" ? "size-3" : "size-4"} strokeWidth={2.4} />
      </span>
      <span className={cn(visual.bold && "font-bold")}>{label}</span>
    </>
  )

  const base = cn(
    "relative inline-flex items-center gap-2 rounded-full border font-medium select-none",
    size === "sm" ? "h-8 pr-3 pl-1.5 text-sm" : "min-h-11 pr-4 pl-2 text-base",
    className,
  )

  if (!onSelect) {
    return (
      <span
        data-emotion={emotion}
        style={style}
        className={cn(base, "border-transparent bg-[color-mix(in_oklab,var(--chip-color)_22%,var(--card))]")}
      >
        {content}
      </span>
    )
  }

  return (
    <motion.button
      type="button"
      data-emotion={emotion}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(emotion)}
      style={style}
      whileTap={reduced || disabled ? undefined : { scale: 0.94 }}
      transition={spring}
      className={cn(
        base,
        "group transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-(--chip-color) bg-(--chip-color) text-(--chip-ink)"
          : "border-border bg-card text-foreground hover:border-(--chip-color)",
      )}
    >
      {selected && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full bg-(--chip-color) opacity-30 blur-md"
          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.35, scale: 1 }}
          transition={{ duration: 0.32 }}
        />
      )}
      <span className="relative inline-flex items-center gap-2">{content}</span>
    </motion.button>
  )
}
