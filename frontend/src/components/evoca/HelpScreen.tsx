import { HeartHandshake } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useRef } from "react"

import { cn } from "@/lib/utils"

import { DraftBadge, HelpLineList, type HelpLine } from "./SupportCard"

export interface HelpScreenProps {
  open: boolean
  title: string
  message: string
  lines: HelpLine[]
  /** Se llama al tocar una línea (para registrar el evento, sin guardar la nota). */
  onOpenLine?: (line: HelpLine) => void
  onClose: () => void
  closeLabel?: string
  draft?: boolean
}

/**
 * Pantalla completa de ayuda inmediata (HU6 · escenario 2): las líneas oficiales están a la
 * vista y se llaman con un toque, sin pasos intermedios. Calmada a propósito: sin animación,
 * sin rojo ni colores de alarma y sin lenguaje de diagnóstico.
 */
export function HelpScreen({
  open,
  title,
  message,
  lines,
  onOpenLine,
  onClose,
  closeLabel = "Volver a mi nota",
  draft = false,
}: HelpScreenProps) {
  // Al cerrar, el foco vuelve a donde estaba (la nota), para seguir escribiendo.
  const returnFocus = useRef<HTMLElement | null>(null)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 overflow-y-auto bg-support text-support-ink outline-none"
          onOpenAutoFocus={(event) => {
            // El foco va a la primera línea: llamar es lo primero que se puede hacer.
            event.preventDefault()
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            ;(event.currentTarget as HTMLElement).querySelector<HTMLElement>("a[href^='tel:']")?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus.current?.focus()
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-6 px-5 py-10">
            <span className="grid size-14 place-items-center rounded-3xl bg-card/70">
              <HeartHandshake aria-hidden="true" className="size-7" />
            </span>
            <div className="flex flex-col gap-3">
              <DialogPrimitive.Title className="text-3xl font-semibold text-balance">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-lg leading-relaxed">{message}</DialogPrimitive.Description>
            </div>
            <HelpLineList lines={lines} onOpen={onOpenLine} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {draft && <DraftBadge />}
              <DialogPrimitive.Close
                className={cn(
                  "ml-auto min-h-12 rounded-full border border-current/30 px-6 font-semibold",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {closeLabel}
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
