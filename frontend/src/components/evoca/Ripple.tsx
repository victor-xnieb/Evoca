/*
 * Adaptado de «Ripple» de Magic UI (MIT, https://magicui.design/docs/components/ripple).
 * Cambios: cada onda toma un color de emoción de los tokens de Evoca, las ondas se miden
 * en porcentaje de un cuadrado que cabe en el contenedor (así nunca se cortan) y respeta
 * el movimiento reducido mediante las reglas globales de animación.
 * Copyright (c) Magic UI. Ver CREDITS.md.
 */
import { memo, type ComponentPropsWithoutRef, type CSSProperties } from "react"

import { EMOTION_SLUGS } from "@/lib/emotions"
import { cn } from "@/lib/utils"

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  /** Tamaño de la onda central, en porcentaje del lado del cuadrado. */
  innerSize?: number
  mainCircleOpacity?: number
  numCircles?: number
}

/**
 * Ondas concéntricas que «respiran»: la huella que deja un recuerdo. Decorativo.
 * La onda más grande ocupa el lado menor del contenedor, así siempre se ve completa.
 */
export const Ripple = memo(function Ripple({
  innerSize = 34,
  mainCircleOpacity = 0.6,
  numCircles = 6,
  className,
  ...props
}: RippleProps) {
  const step = numCircles > 1 ? (100 - innerSize) / (numCircles - 1) : 0

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 grid place-items-center select-none", className)}
      {...props}
      style={{ containerType: "size", ...props.style }}
    >
      {/* Cuadrado que cabe dentro del contenedor (lado = el menor entre ancho y alto). */}
      <div className="relative" style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}>
        {Array.from({ length: numCircles }, (_, i) => {
          // Se reserva un 4 % para que el «respiro» (scale) no toque el borde.
          const size = (innerSize + i * step) * 0.96
          const color = `var(--emotion-${EMOTION_SLUGS[i % EMOTION_SLUGS.length]})`
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 animate-ripple rounded-full border"
              style={
                {
                  "--i": i,
                  width: `${size}%`,
                  height: `${size}%`,
                  opacity: Math.max(0.14, mainCircleOpacity - i * 0.08),
                  borderColor: color,
                  background: `color-mix(in oklab, ${color} 12%, transparent)`,
                  transform: "translate(-50%, -50%) scale(1)",
                } as CSSProperties
              }
            />
          )
        })}
      </div>
    </div>
  )
})
