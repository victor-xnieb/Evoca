import { EMOTION_SLUGS } from "@/lib/emotions"
import { cn } from "@/lib/utils"

export interface EvocaWordmarkProps {
  className?: string
}

/**
 * Marca «evoca.» en minúsculas. La palabra usa el color del texto del tema (crema en oscuro,
 * tinta en claro); el punto pasa por los colores de las emociones fundiendo capas con
 * opacidad. Con movimiento reducido el punto queda fijo en calma.
 */
export function EvocaWordmark({ className }: EvocaWordmarkProps) {
  return (
    <span className={cn("inline-flex items-baseline font-display font-semibold tracking-tight text-foreground", className)}>
      evoca
      <span aria-hidden="true" className="relative inline-block text-emotion-calma select-none">
        .
        {EMOTION_SLUGS.map((slug, index) => (
          <span
            key={slug}
            className="evoca-dot-layer absolute inset-0"
            style={{ color: `var(--emotion-${slug})`, animationDelay: `${index * 2}s` }}
          >
            .
          </span>
        ))}
      </span>
    </span>
  )
}
