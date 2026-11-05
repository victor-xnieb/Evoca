/*
 * Adaptado de «Ripple» de Magic UI (MIT, https://magicui.design/docs/components/ripple).
 * Cambios: cada onda toma un color de emoción de los tokens de Evoca, menos ondas y más
 * suaves, y respeta el movimiento reducido mediante las reglas globales de animación.
 * Copyright (c) Magic UI. Ver CREDITS.md.
 */
import { memo, type ComponentPropsWithoutRef, type CSSProperties } from "react"

import { EMOTION_SLUGS } from "@/lib/emotions"
import { cn } from "@/lib/utils"

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number
  mainCircleOpacity?: number
  numCircles?: number
}

/** Ondas concéntricas que «respiran»: la huella que deja un recuerdo. Decorativo. */
export const Ripple = memo(function Ripple({
  mainCircleSize = 180,
  mainCircleOpacity = 0.6,
  numCircles = 6,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden select-none",
        "mask-[radial-gradient(circle_at_center,white_30%,transparent_72%)]",
        className,
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 64
        const color = `var(--emotion-${EMOTION_SLUGS[i % EMOTION_SLUGS.length]})`
        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 animate-ripple rounded-full border"
            style={
              {
                "--i": i,
                width: size,
                height: size,
                opacity: Math.max(0.12, mainCircleOpacity - i * 0.08),
                borderColor: color,
                background: `color-mix(in oklab, ${color} 14%, transparent)`,
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
})
