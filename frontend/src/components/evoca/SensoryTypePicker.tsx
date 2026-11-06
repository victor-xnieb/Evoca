import { motion } from "motion/react"
import { useId, useRef, type KeyboardEvent } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { riseIn, staggerContainer, fadeIn, spring } from "@/lib/motion"
import { getSensoryIcon, type Option } from "@/lib/sensory"
import { cn } from "@/lib/utils"

export interface SensoryTypePickerProps {
  /** Tipos disponibles con su etiqueta (vienen de la API). */
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Cuadrícula de tipos sensoriales con íconos grandes para elegir con un toque.
 * Es un radiogroup: se navega con flechas y se elige con Enter o Espacio.
 */
export function SensoryTypePicker({
  options,
  value,
  onChange,
  label = "¿Qué despertó este recuerdo?",
  error,
  disabled = false,
  className,
}: SensoryTypePickerProps) {
  const reduced = useReducedMotion()
  const labelId = useId()
  const errorId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = options.findIndex((option) => option.value === value)

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const columns = 3
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    }
    if (!(event.key in offsets)) return
    event.preventDefault()
    const next = (index + offsets[event.key] + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <span id={labelId} className="text-base font-semibold">
        {label}
      </span>
      <motion.div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="grid grid-cols-3 gap-2.5"
        variants={staggerContainer(0.04)}
        initial="hidden"
        animate="visible"
      >
        {options.map((option, index) => {
          const Icon = getSensoryIcon(option.value)
          const checked = option.value === value
          const focusable = selectedIndex === -1 ? index === 0 : checked
          return (
            <motion.button
              key={option.value}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={focusable ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => move(event, index)}
              variants={reduced ? fadeIn : riseIn}
              whileTap={reduced || disabled ? undefined : { scale: 0.95 }}
              transition={spring}
              className={cn(
                "relative flex aspect-square min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-2",
                "text-sm font-semibold transition-colors duration-200",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "disabled:cursor-not-allowed disabled:opacity-45",
                checked
                  ? "border-primary bg-primary text-primary-foreground shadow-lifted"
                  : "border-border bg-card text-foreground shadow-soft hover:border-ring",
              )}
            >
              <Icon aria-hidden="true" className="size-8" strokeWidth={1.8} />
              <span>{option.label}</span>
            </motion.button>
          )
        })}
      </motion.div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
