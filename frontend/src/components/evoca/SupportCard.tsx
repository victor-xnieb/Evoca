import { HeartHandshake, Phone } from "lucide-react"
import { useId } from "react"

import { cn } from "@/lib/utils"

export interface HelpLine {
  name: string
  /** Número a marcar tal como se escribe en el teléfono (por ejemplo "192"). */
  phone: string
  description?: string
}

export interface SupportCardProps {
  title: string
  message: string
  lines: HelpLine[]
  /** «Ahora no»: cierra sin juicio. */
  onDismiss?: () => void
  dismissLabel?: string
  /** Se llama cuando la persona abre una línea de ayuda (para registrar el evento). */
  onOpenHelp?: (line: HelpLine) => void
  /** Marca visible de contenido provisional, pendiente de revisión del psicólogo asesor. */
  draft?: boolean
  className?: string
}

/**
 * Tarjeta de orientación hacia ayuda profesional. Es deliberadamente calmada y sobria:
 * sin animaciones, sin rojo ni colores de alarma, sin lenguaje de diagnóstico.
 */
export function SupportCard({
  title,
  message,
  lines,
  onDismiss,
  dismissLabel = "Ahora no",
  onOpenHelp,
  draft = false,
  className,
}: SupportCardProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-4 rounded-3xl bg-support p-6 text-support-ink", className)}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card/70">
          <HeartHandshake aria-hidden="true" className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>

      {lines.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={`${line.name}-${line.phone}`}>
              <a
                href={`tel:${line.phone.replace(/[^\d+]/g, "")}`}
                onClick={() => onOpenHelp?.(line)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl bg-card/80 px-4 py-3 text-foreground",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <Phone aria-hidden="true" className="size-5 shrink-0 text-support-ink" />
                <span className="flex flex-col">
                  <span className="font-semibold">
                    {line.name} · <span className="tabular-nums">{line.phone}</span>
                  </span>
                  {line.description && <span className="text-sm text-muted-foreground">{line.description}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {draft && (
          <span className="rounded-full border border-current/30 px-3 py-1 text-xs font-medium">
            Contenido provisional · pendiente de revisión profesional
          </span>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "ml-auto min-h-11 rounded-full px-5 font-semibold underline-offset-4 hover:underline",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            {dismissLabel}
          </button>
        )}
      </div>
    </section>
  )
}
