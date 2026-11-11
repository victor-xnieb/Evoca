import { motion } from "motion/react"
import { useMemo } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { arrangeSpheres, type MemorySphere as Sphere } from "@/lib/memories"
import { cn } from "@/lib/utils"

import { LABEL_WIDTH, MemorySphere } from "./MemorySphere"

/** Solo las primeras esferas flotan: con cientos, animarlas todas cansaría al teléfono. */
const FLOATING = 12

/** Las primeras esferas aparecen con un escalonado breve; el resto, de inmediato. */
const STAGGERED = 24

export interface MemoryMapProps {
  memories: Sphere[]
  /** Etiqueta visible de cada emoción. */
  emotionLabel: (emotion: string) => string
  onOpen?: (memory: Sphere) => void
  className?: string
}

/**
 * Mapa de recuerdos (HU10): esferas sin orden cronológico, del color de su emoción y del
 * tamaño de sus huellas. Se acomodan en filas centradas con un desplazamiento orgánico, así
 * que en el teléfono solo se recorre hacia abajo.
 */
export function MemoryMap({ memories, emotionLabel, onOpen, className }: MemoryMapProps) {
  const reduced = useReducedMotion()
  const placed = useMemo(() => arrangeSpheres(memories), [memories])

  return (
    <ul aria-label="Mapa de recuerdos" className={cn("flex flex-wrap items-center justify-center gap-x-2 gap-y-4 py-4", className)}>
      {placed.map(({ sphere, diameter, dx, dy }, index) => {
        const content = (
          <MemorySphere
            memory={sphere}
            emotionLabel={emotionLabel(sphere.emotion)}
            diameter={diameter}
            animated={index < FLOATING}
            phase={(index % FLOATING) / FLOATING}
            onOpen={onOpen}
          />
        )
        if (index < STAGGERED) {
          return (
            <motion.li
              key={sphere.id}
              style={{ x: dx, y: dy }}
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: index * 0.03 }}
            >
              {content}
            </motion.li>
          )
        }
        // El resto, sin Motion y sin pintarse mientras está fuera de la pantalla.
        return (
          <li
            key={sphere.id}
            style={{
              transform: `translate(${dx}px, ${dy}px)`,
              contentVisibility: "auto",
              containIntrinsicSize: `${Math.max(diameter, LABEL_WIDTH) + 8}px ${diameter + 56}px`,
            }}
          >
            {content}
          </li>
        )
      })}
    </ul>
  )
}

/** Esqueleto mientras carga: esferas neutras que respiran (sin movimiento si se pidió reducirlo). */
export function MemoryMapSkeleton() {
  const sizes = [92, 64, 108, 72, 84, 60, 96]
  return (
    <div role="status" aria-label="Cargando tus recuerdos" className="flex flex-wrap items-center justify-center gap-6 py-6">
      {sizes.map((size, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="animate-pulse rounded-full bg-muted motion-reduce:animate-none"
          style={{ width: size * 0.67, height: size * 0.67 }}
        />
      ))}
    </div>
  )
}
