import { useId, type Ref } from "react"

import { NOTE_MAX_LENGTH, NOTE_PLACEHOLDERS } from "@/lib/messages"

interface NoteFieldProps {
  value: string
  onChange: (value: string) => void
  /** Tipo elegido: cambia el ejemplo del placeholder. */
  sensoryType?: string | null
  error?: string
  inputRef?: Ref<HTMLTextAreaElement>
  label?: string
}

/** Nota corta de una huella, con contador de caracteres (crear y editar). */
export function NoteField({ value, onChange, sensoryType, error, inputRef, label = "Escribe una nota corta" }: NoteFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        ref={inputRef}
        rows={3}
        maxLength={NOTE_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={NOTE_PLACEHOLDERS[sensoryType ?? "default"] ?? NOTE_PLACEHOLDERS.default}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-contador`}
        className="min-h-24 w-full resize-y rounded-2xl border border-input bg-background/70 px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium text-destructive">{error}</span>
        <span id={`${id}-contador`} className="text-muted-foreground tabular-nums">
          {value.length}/{NOTE_MAX_LENGTH}
        </span>
      </div>
    </div>
  )
}
