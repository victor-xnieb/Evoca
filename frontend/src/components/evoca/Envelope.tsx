import { AnimatePresence, motion } from "motion/react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

export type EnvelopeState = "sealed" | "ready" | "open"

export interface EnvelopeProps {
  /** Sellado, listo para abrir (llegó su fecha: el sello brilla) o abierto. */
  state: EnvelopeState
  /** Al sellar una carta: la solapa se cierra y el sello de cera cae encima. */
  stamp?: boolean
  className?: string
}

const ease = [0.22, 1, 0.36, 1] as const

/**
 * HU19: el sobre de una carta a mi yo del futuro, con su sello de cera. Es solo la imagen
 * (aria-hidden): quien lo usa dice con texto si está sellado y cuándo se abre. Con «reducir
 * movimiento», la solapa y el sello cambian sin girar ni caer.
 */
export function Envelope({ state, stamp = false, className }: EnvelopeProps) {
  const reduced = useReducedMotion()
  const open = state === "open"

  return (
    // Abierto, la solapa sube por encima del sobre: el marco crece para dejarle su espacio.
    <div aria-hidden="true" className={cn("relative w-full", className)} style={{ aspectRatio: open ? "16 / 15.8" : "16 / 10" }}>
      <div className="evoca-envelope absolute inset-x-0 bottom-0 aspect-[16/10]">
        <div className="evoca-envelope-back absolute inset-0" />
        <div className="evoca-envelope-side-left absolute inset-0" />
        <div className="evoca-envelope-side-right absolute inset-0" />
        <div className="evoca-envelope-bottom absolute inset-0" />
        <motion.div
          className="evoca-envelope-flap absolute inset-x-0 top-0 h-[58%] origin-top"
          initial={stamp && !reduced ? { rotateX: 180 } : false}
          animate={{ rotateX: open ? 180 : 0, zIndex: open ? 0 : 3 }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease, delay: open ? 0.25 : 0 }}
        />
        <AnimatePresence>
          {!open && (
            <motion.span
              key="sello"
              className={cn("evoca-wax absolute top-[58%] left-1/2 z-10 grid w-[24%] place-items-center", state === "ready" && "evoca-wax-ready")}
              style={{ x: "-50%", y: "-50%" }}
              initial={stamp && !reduced ? { scale: 1.9, opacity: 0, rotate: -18 } : false}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : {
                      scale: 1.25,
                      opacity: 0,
                      rotate: 14,
                      transition: { duration: 0.35 },
                    }
              }
              transition={{
                duration: 0.45,
                ease,
                delay: stamp && !reduced ? 0.65 : 0,
              }}
            >
              <span className="evoca-wax-ring grid aspect-square w-[72%] place-items-center rounded-full font-display text-[clamp(0.9rem,4vw,1.6rem)] font-semibold">
                E
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
