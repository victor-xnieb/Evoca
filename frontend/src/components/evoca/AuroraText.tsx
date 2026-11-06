/*
 * Adaptado de «Aurora Text» de Magic UI (MIT, https://magicui.design/docs/components/aurora-text).
 * Cambios: usa la paleta de emociones de Evoca y, en lugar de animar background-position,
 * funde capas de degradado con opacidad y mueve el texto solo con transformaciones.
 * Copyright (c) Magic UI. Ver CREDITS.md.
 */
import { memo, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AuroraTextProps {
  children: ReactNode
  className?: string
}

const LAYERS = [
  "linear-gradient(120deg, var(--emotion-alegria), var(--emotion-ansiedad), var(--emotion-gratitud))",
  "linear-gradient(120deg, var(--emotion-gratitud), var(--emotion-miedo), var(--emotion-tristeza))",
  "linear-gradient(120deg, var(--emotion-calma), var(--emotion-tristeza), var(--emotion-alegria))",
]

const clipText: CSSProperties = {
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
}

/** Texto con degradado vivo de emociones, para el título de bienvenida. */
export const AuroraText = memo(function AuroraText({ children, className }: AuroraTextProps) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="relative inline-block animate-aurora-drift">
        {/* La primera capa define el tamaño; las demás se superponen y aparecen por turnos. */}
        <span className="relative inline-block" style={{ ...clipText, backgroundImage: LAYERS[0] }}>
          {children}
        </span>
        {LAYERS.slice(1).map((background, index) => (
          <span
            key={background}
            className="absolute inset-0 inline-block animate-[aurora-fade_9s_ease-in-out_infinite]"
            style={{ ...clipText, backgroundImage: background, animationDelay: `${index * 3}s` }}
          >
            {children}
          </span>
        ))}
      </span>
    </span>
  )
})
