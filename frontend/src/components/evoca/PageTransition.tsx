import { motion } from "motion/react"
import type { ReactNode } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { duration, ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * Envuelve cada pantalla para que entre y salga con un desplazamiento corto y un fundido.
 * Ayuda a entender que se cambió de sección; con movimiento reducido solo funde.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const reduced = useReducedMotion()
  const offset = reduced ? 0 : 12

  return (
    <motion.div
      className={cn("flex flex-col", className)}
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.outSoft } }}
      exit={{ opacity: 0, y: -offset / 2, transition: { duration: duration.fast, ease: ease.inOutSoft } }}
    >
      {children}
    </motion.div>
  )
}
