/*
 * Adaptado del loader «new-sloth-45» de Javierrocadev en Uiverse.io (MIT,
 * https://uiverse.io/Javierrocadev/new-sloth-45). Cambios: tres puntos con colores de
 * emoción, animación con curva de Evoca y etiqueta accesible. Ver CREDITS.md.
 */
import { cn } from "@/lib/utils"

interface EvocaLoaderProps {
  label?: string
  size?: "sm" | "md"
  className?: string
}

const DOTS = [
  { color: "var(--emotion-alegria)", delay: "0s" },
  { color: "var(--emotion-gratitud)", delay: "-0.3s" },
  { color: "var(--emotion-calma)", delay: "-0.5s" },
]

/** Indicador de carga: tres puntos de colores que rebotan con suavidad. */
export function EvocaLoader({ label = "Cargando…", size = "md", className }: EvocaLoaderProps) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden="true" className="flex flex-row items-end gap-1.5">
        {DOTS.map((dot) => (
          <span
            key={dot.color}
            className={cn("animate-dot-bounce rounded-full", size === "sm" ? "size-2" : "size-3.5")}
            style={{ background: dot.color, animationDelay: dot.delay }}
          />
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
