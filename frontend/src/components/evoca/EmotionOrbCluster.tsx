import type { CSSProperties } from "react"

import type { EmotionSlug } from "@/lib/emotions"
import { cn } from "@/lib/utils"

import { EmotionOrb } from "./EmotionOrb"

/**
 * Misma composición que la ilustración «orbes» (centro y cuatro alrededor), en un lienzo
 * de 200 unidades: x e y son el centro de cada esfera y d su diámetro visible.
 */
const LAYOUT: Array<{ emotion: EmotionSlug; x: number; y: number; d: number }> = [
  { emotion: "gratitud", x: 100, y: 100, d: 54 },
  { emotion: "alegria", x: 50, y: 64, d: 72 },
  { emotion: "tristeza", x: 156, y: 72, d: 60 },
  { emotion: "calma", x: 144, y: 148, d: 74 },
  { emotion: "nostalgia", x: 52, y: 148, d: 56 },
]

/** La esfera ocupa ~2/3 de su imagen; el resto es margen transparente. */
const ORB_FILL = 0.67

/** Cuánto se separan del centro (px) cuando el puntero entra en la tarjeta que las contiene. */
const SPREAD = 9

export interface EmotionOrbClusterProps {
  /** Lado del conjunto en px (160 = el mismo de la ilustración Lottie). */
  size?: number
  animated?: boolean
  className?: string
}

/**
 * Cinco esferas de texturas distintas flotando con fases distintas. Decorativo.
 * Dentro de una GlassCard se separan un poco al pasar el mouse (`.evoca-orb-spread`).
 */
export function EmotionOrbCluster({ size = 160, animated = true, className }: EmotionOrbClusterProps) {
  return (
    <div aria-hidden="true" className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {LAYOUT.map((orb, index) => {
        const box = Math.round(((orb.d / ORB_FILL) * size) / 200)
        return (
          <span
            key={orb.emotion}
            className="evoca-orb-spread absolute"
            style={
              {
                left: `${orb.x / 2}%`,
                top: `${orb.y / 2}%`,
                width: box,
                height: box,
                margin: -box / 2,
                "--spread-x": `${((orb.x - 100) / 100) * SPREAD}px`,
                "--spread-y": `${((orb.y - 100) / 100) * SPREAD}px`,
              } as CSSProperties
            }
          >
            <EmotionOrb
              emotion={orb.emotion}
              size={box}
              animated={animated}
              phase={index / LAYOUT.length}
              decorative
              priority
            />
          </span>
        )
      })}
    </div>
  )
}
