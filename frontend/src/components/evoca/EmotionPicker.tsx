import { useId, useRef, type KeyboardEvent } from "react"

import type { Option } from "@/lib/sensory"
import { cn } from "@/lib/utils"

import { EmotionChip } from "./EmotionChip"

export interface EmotionPickerProps {
  /** Emociones disponibles con su etiqueta (vienen de la API). */
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Las 8 emociones como un conjunto de esferas: selección única (radiogroup), con flechas
 * para moverse y un toque para elegir.
 */
export function EmotionPicker({
  options,
  value,
  onChange,
  label = "¿Qué sentiste?",
  error,
  disabled = false,
  className,
}: EmotionPickerProps) {
  const labelId = useId()
  const errorId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = options.findIndex((option) => option.value === value)

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
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
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="flex flex-wrap gap-2"
      >
        {options.map((option, index) => (
          <EmotionChip
            key={option.value}
            emotion={option.value}
            label={option.label}
            mode="radio"
            selected={option.value === value}
            disabled={disabled}
            onSelect={onChange}
            tabIndex={(selectedIndex === -1 ? index === 0 : option.value === value) ? 0 : -1}
            onKeyDown={(event) => move(event, index)}
            buttonRef={(element) => {
              buttons.current[index] = element
            }}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
