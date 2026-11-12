import type { CSSProperties, MouseEvent } from "react"

import { getEmotionVisual, isEmotionSlug } from "@/lib/emotions"
import type { MemorySphere as Sphere } from "@/lib/memories"
import { sphereDiameter } from "@/lib/memories"
import { cn } from "@/lib/utils"

import { EmotionOrb, StaticEmotionOrb } from "./EmotionOrb"

export interface MemorySphereProps {
  memory: Sphere
  /** Etiqueta visible de la emoción (la entrega la API en el catálogo). */
  emotionLabel: string
  /** Por defecto depende de cuántas huellas tiene el recuerdo. */
  diameter?: number
  /** Flotación suave; el mapa la activa solo en algunas esferas para no cargar el teléfono. */
  animated?: boolean
  /** Desfase de la flotación (0 a 1), para que no se muevan al unísono. */
  phase?: number
  /** Nombre y huellas debajo de la esfera. El mapa los oculta al alejarse para no saturarlo. */
  showLabel?: boolean
  /** Recuerdo elegido en el mapa: se marca con un anillo. */
  selected?: boolean
  /** Versión ligera para mapas con muchas esferas: sin resplandor ni halo al pasar el cursor. */
  lite?: boolean
  /** El evento permite distinguir el teclado (detail = 0) de un toque. */
  onOpen?: (memory: Sphere, event: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

/** Ancho mínimo para que el nombre quepa en dos líneas aunque la esfera sea pequeña. */
export const LABEL_WIDTH = 116

const plural = (count: number) => `${count} ${count === 1 ? "huella" : "huellas"}`

/**
 * Un recuerdo en el mapa (HU10): esfera del color de su emoción, del tamaño de sus huellas,
 * con su nombre debajo. El color nunca va solo: lo acompañan el ícono de la emoción y el
 * nombre accesible («Recuerdo: emoción, N huellas»).
 */
export function MemorySphere({
  memory,
  emotionLabel,
  diameter,
  animated = false,
  phase,
  showLabel = true,
  selected = false,
  lite = false,
  onOpen,
  className,
}: MemorySphereProps) {
  const visual = getEmotionVisual(memory.emotion)
  const Icon = visual.icon
  const size = diameter ?? sphereDiameter(memory.trace_count)

  return (
    <button
      type="button"
      data-testid="memory-sphere"
      data-emotion={memory.emotion}
      aria-label={`${memory.name}: ${emotionLabel}, ${plural(memory.trace_count)}`}
      aria-pressed={selected}
      onClick={(event) => onOpen?.(memory, event)}
      style={{ "--sphere-color": visual.color, width: Math.max(size, LABEL_WIDTH) } as CSSProperties}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-3xl p-1 text-center transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        {/* Halo del color de la emoción al pasar el cursor, enfocar o elegir la esfera. */}
        {(!lite || selected) && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-[18%] rounded-full bg-(--sphere-color) blur-xl transition-opacity duration-300 group-hover:opacity-45 group-focus-visible:opacity-45",
              selected ? "opacity-60" : "opacity-0",
            )}
          />
        )}
        {selected && (
          <span aria-hidden="true" className="absolute inset-[12%] rounded-full border-2 border-(--sphere-color)" />
        )}
        {isEmotionSlug(memory.emotion) && animated ? (
          <EmotionOrb emotion={memory.emotion} size={size} animated phase={phase} interactive={false} decorative />
        ) : isEmotionSlug(memory.emotion) ? (
          <StaticEmotionOrb emotion={memory.emotion} size={size} decorative glow={!lite || selected} />
        ) : (
          <span aria-hidden="true" className="size-2/3 rounded-full bg-(--sphere-color)" />
        )}
      </span>
      {showLabel && (
        <span data-sphere-label className="flex max-w-full flex-col items-center rounded-2xl bg-background/80 px-2 py-0.5">
          <span className="line-clamp-2 text-sm leading-tight font-semibold text-foreground">{memory.name}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-hidden="true">
            <Icon className="size-3" strokeWidth={2.4} />
            {plural(memory.trace_count)}
          </span>
        </span>
      )}
    </button>
  )
}
