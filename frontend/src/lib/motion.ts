import type { Transition, Variants } from "motion/react"

/**
 * Duraciones y curvas para Motion. Son el espejo en JS de styles/tokens.css
 * (--duration-* y --ease-*); si cambias uno, cambia el otro.
 */
export const duration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.56,
} as const

export const ease = {
  outSoft: [0.22, 1, 0.36, 1],
  inOutSoft: [0.65, 0, 0.35, 1],
} as const

export const spring: Transition = { type: "spring", stiffness: 420, damping: 30, mass: 0.8 }

/** Entrada escalonada de listas: cada hijo aparece un poco después del anterior. */
export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  }
}

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.outSoft } },
}

/** Versión sin desplazamiento para movimiento reducido. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.fast } },
}
