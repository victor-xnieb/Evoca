import { motion } from "motion/react"
import type { CSSProperties, KeyboardEvent, Ref } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual, isEmotionSlug } from "@/lib/emotions"
import { spring } from "@/lib/motion"
import { cn } from "@/lib/utils"

import { EmotionOrb } from "./EmotionOrb"

export interface EmotionChipProps {
  /** Identificador de la emoción (alegria, calma, ...). */
  emotion: string
  /** Etiqueta visible, tal como la entrega la API. */
  label: string
  selected?: boolean
  disabled?: boolean
  size?: "sm" | "md"
  /** Si se pasa, el chip es un botón; si no, es una etiqueta estática. */
  onSelect?: (emotion: string) => void
  /** "radio" lo vuelve una opción de un grupo de selección única (EmotionPicker). */
  mode?: "toggle" | "radio"
  tabIndex?: number
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  buttonRef?: Ref<HTMLButtonElement>
  className?: string
}

/**
 * Chip de emoción: esfera de su textura + color propio + texto (nunca solo color). Como
 * botón, se «ilumina» al seleccionarlo con un halo de su color.
 */
export function EmotionChip({
  emotion,
  label,
  selected = false,
  disabled = false,
  size = "md",
  onSelect,
  mode = "toggle",
  tabIndex,
  onKeyDown,
  buttonRef,
  className,
}: EmotionChipProps) {
  const reduced = useReducedMotion()
  const visual = getEmotionVisual(emotion)
  const Icon = visual.icon
  const style = { "--chip-color": visual.color, "--chip-ink": visual.ink } as CSSProperties

  const content = (
    <>
      {isEmotionSlug(emotion) ? (
        <EmotionOrb emotion={emotion} size={size === "sm" ? 28 : 40} decorative className="-my-1.5 -ml-1" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "grid place-items-center rounded-full bg-(--chip-color) text-(--chip-ink)",
            size === "sm" ? "size-5" : "size-7",
          )}
        >
          <Icon className={size === "sm" ? "size-3" : "size-4"} strokeWidth={2.4} />
        </span>
      )}
      <span className={cn(visual.bold && "font-bold")}>{label}</span>
    </>
  )

  const base = cn(
    "relative inline-flex items-center gap-1.5 rounded-full border font-medium select-none",
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

  const state = mode === "radio" ? { role: "radio", "aria-checked": selected } : { "aria-pressed": selected }

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      data-emotion={emotion}
      {...state}
      tabIndex={tabIndex}
      disabled={disabled}
      onClick={() => onSelect(emotion)}
      onKeyDown={onKeyDown}
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
      <span className="relative inline-flex items-center gap-1.5">{content}</span>
    </motion.button>
  )
}
