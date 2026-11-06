import { CloudOff } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { fadeIn, riseIn, staggerContainer } from "@/lib/motion"
import { cn } from "@/lib/utils"

import { LottieIllustration } from "./LottieIllustration"
import type { IllustrationName } from "./lottie/animations"

export interface EmptyStateProps {
  title: string
  description?: string
  /** Botón o enlace principal (por ejemplo, «Registrar mi primera huella»). */
  action?: ReactNode
  /** "empty" muestra ilustración animada; "error" es sobrio y ofrece reintentar. */
  variant?: "empty" | "error"
  illustration?: IllustrationName
  /** Reemplaza la ilustración Lottie (por ejemplo, un conjunto de esferas de emociones). */
  visual?: ReactNode
  compact?: boolean
  className?: string
}

/** Estado vacío o de error con tono cálido y una acción clara. */
export function EmptyState({
  title,
  description,
  action,
  variant = "empty",
  illustration = "orbs",
  visual,
  compact = false,
  className,
}: EmptyStateProps) {
  const reduced = useReducedMotion()
  const item = reduced ? fadeIn : riseIn

  return (
    <motion.section
      role={variant === "error" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl px-6 text-center",
        compact ? "py-6" : "py-10",
        className,
      )}
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={item}>
        {variant === "error" ? (
          <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <CloudOff aria-hidden="true" className="size-8" />
          </span>
        ) : visual ? (
          visual
        ) : (
          <LottieIllustration name={illustration} className={compact ? "w-28" : "w-40"} />
        )}
      </motion.div>
      <motion.h2 variants={item} className={cn("font-semibold text-balance", compact ? "text-xl" : "text-2xl")}>
        {title}
      </motion.h2>
      {description && (
        <motion.p variants={item} className="max-w-sm text-pretty text-muted-foreground">
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div variants={item} className="pt-2">
          {action}
        </motion.div>
      )}
    </motion.section>
  )
}
