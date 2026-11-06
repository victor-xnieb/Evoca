import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TextFieldProps extends Omit<ComponentProps<"input">, "id"> {
  id: string
  label: string
  hint?: string
  error?: string
}

/** Campo con etiqueta, ayuda y error asociados (aria-describedby / aria-invalid). */
export function TextField({ id, label, hint, error, className, ...props }: TextFieldProps) {
  const describedBy = [hint && !error && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn("h-12 rounded-2xl bg-background/70 px-4 text-base", className)}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-ayuda`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
