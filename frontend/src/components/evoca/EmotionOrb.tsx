import { motion } from "motion/react"
import type { CSSProperties } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { EMOTION_ORBS } from "@/lib/emotionOrbs"
import { EMOTION_SLUGS, EMOTION_VISUALS, type EmotionSlug } from "@/lib/emotions"
import { cn } from "@/lib/utils"

export type EmotionOrbSize = "sm" | "md" | "lg" | number

/** Lado de la caja en px. La esfera ocupa ~2/3: el margen transparente deja sitio al resplandor. */
const SIZES = { sm: 40, md: 96, lg: 160 } as const

/** Hasta este tamaño basta la imagen de 128 px (cubre pantallas de densidad 3x). */
const SMALL_IMAGE_MAX = 64

export interface EmotionOrbProps {
  emotion: EmotionSlug
  size?: EmotionOrbSize
  /** Flotación suave en bucle. Se desactiva sola con movimiento reducido. */
  animated?: boolean
  /** Desfase de la flotación (0 a 1). Por defecto depende de la emoción. */
  phase?: number
  /** Si la esfera solo adorna (la emoción ya está escrita al lado), queda oculta a lectores. */
  decorative?: boolean
  /** Carga inmediata para lo que se ve al abrir la pantalla; el resto se carga diferido. */
  priority?: boolean
  className?: string
}

/** Esfera de una emoción con su textura propia, un resplandor del color del token y flotación opcional. */
export function EmotionOrb({
  emotion,
  size = "md",
  animated = false,
  phase,
  decorative = false,
  priority = false,
  className,
}: EmotionOrbProps) {
  const reduced = useReducedMotion()
  const px = typeof size === "number" ? size : SIZES[size]
  const asset = EMOTION_ORBS[emotion]
  const offset = phase ?? EMOTION_SLUGS.indexOf(emotion) / EMOTION_SLUGS.length
  const float = animated && !reduced
  // Duraciones distintas por esfera: aunque empiecen juntas, nunca se mueven al unísono.
  const duration = 5.5 + offset * 2.5

  return (
    <motion.span
      className={cn("relative inline-block shrink-0", className)}
      style={
        {
          width: px,
          height: px,
          "--orb-color": EMOTION_VISUALS[emotion].color,
          "--orb-size": `${px}px`,
        } as CSSProperties
      }
      animate={float ? { y: [0, -px * 0.05, 0], rotate: [0, offset > 0.5 ? 2 : -2, 0] } : undefined}
      transition={
        float ? { duration, ease: "easeInOut", repeat: Infinity, delay: offset * 1.6 } : undefined
      }
      data-testid="emotion-orb"
    >
      <img
        src={px <= SMALL_IMAGE_MAX ? asset.srcSm : asset.src}
        srcSet={`${asset.srcSm} 128w, ${asset.src} 500w`}
        sizes={`${px}px`}
        width={px}
        height={px}
        alt={decorative ? "" : asset.alt}
        aria-hidden={decorative || undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="evoca-orb size-full select-none"
      />
    </motion.span>
  )
}
