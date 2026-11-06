import { motion, useSpring } from "motion/react"
import { useRef, type CSSProperties, type PointerEvent, type ReactNode, type Ref } from "react"
import { Link } from "react-router"

import { useFinePointer } from "@/hooks/use-fine-pointer"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { EMOTION_VISUALS, isEmotionSlug } from "@/lib/emotions"
import { cn } from "@/lib/utils"

const MotionLink = motion.create(Link)

/** Inclinación máxima (grados) y paralaje máximo del contenido marcado (px). */
const MAX_TILT = 5
const MAX_PARALLAX = 6

const TILT_SPRING = { stiffness: 220, damping: 22, mass: 0.6 }

interface GlassCardBaseProps {
  children: ReactNode
  /** Color del borde iluminado y del cursor: una emoción (por ejemplo "calma") o un color CSS. */
  accent?: string
  /** Texto corto que muestra el cursor interactivo al pasar por encima («Ver», «Registrar»). */
  cursorLabel?: string
  /** Etiqueta de la tarjeta (h2, section…) cuando no es clicable. */
  as?: "div" | "section" | "article" | "li"
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

/** Clicable como enlace (`to`) o como botón (`onClick`); si no, es un contenedor. */
export type GlassCardProps = GlassCardBaseProps &
  ({ to: string; onClick?: never } | { onClick: () => void; to?: never } | { to?: undefined; onClick?: undefined })

function accentColor(accent?: string) {
  if (!accent) return "var(--ring)"
  return isEmotionSlug(accent) ? EMOTION_VISUALS[accent].color : accent
}

/**
 * Tarjeta de vidrio, base de todas las tarjetas de Evoca: fondo translúcido con desenfoque
 * fuerte (borra el detalle del video de atrás para que el texto se lea), borde fino y, con
 * mouse, elevación, foco de luz que sigue al puntero, inclinación 3D suave y paralaje de lo
 * marcado con `.evoca-parallax`. En táctil: leve hundimiento y destello al tocar. Con
 * movimiento reducido solo cambia el borde.
 */
export function GlassCard({
  children,
  accent,
  cursorLabel,
  as = "div",
  className,
  to,
  onClick,
  ...aria
}: GlassCardProps) {
  const reduced = useReducedMotion()
  const finePointer = useFinePointer()
  const effects = finePointer && !reduced
  const ref = useRef<HTMLElement>(null)
  const rotateX = useSpring(0, TILT_SPRING)
  const rotateY = useSpring(0, TILT_SPRING)

  // Todo se escribe directo en el elemento (variables CSS y resortes): sin re-renderizar React.
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    const element = ref.current
    if (!effects || event.pointerType !== "mouse" || !element) return
    const rect = element.getBoundingClientRect()
    const nx = (event.clientX - rect.left) / rect.width - 0.5
    const ny = (event.clientY - rect.top) / rect.height - 0.5
    element.style.setProperty("--mx", `${(nx + 0.5) * 100}%`)
    element.style.setProperty("--my", `${(ny + 0.5) * 100}%`)
    element.style.setProperty("--px", `${-nx * 2 * MAX_PARALLAX}px`)
    element.style.setProperty("--py", `${-ny * 2 * MAX_PARALLAX}px`)
    rotateY.set(nx * 2 * MAX_TILT)
    rotateX.set(-ny * 2 * MAX_TILT)
  }

  const handleLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
    ref.current?.style.setProperty("--px", "0px")
    ref.current?.style.setProperty("--py", "0px")
  }

  const handleDown = (event: PointerEvent<HTMLElement>) => {
    const element = ref.current
    if (event.pointerType === "mouse" || !element) return
    // Destello breve del color de acento al tocar (la animación vive en CSS).
    delete element.dataset.flash
    void element.offsetWidth
    element.dataset.flash = ""
  }

  const shared = {
    className: cn("evoca-glass rounded-3xl", (to || onClick) && "evoca-glass-clickable", className),
    style: {
      "--glass-accent": accentColor(accent),
      "--cursor-accent": accentColor(accent),
      ...(effects ? { rotateX, rotateY, transformPerspective: 900 } : {}),
    } as CSSProperties,
    "data-fx": effects ? "on" : "off",
    "data-cursor": "card",
    "data-cursor-label": cursorLabel,
    onPointerMove: handleMove,
    onPointerLeave: handleLeave,
    onPointerDown: handleDown,
    onAnimationEnd: () => {
      if (ref.current) delete ref.current.dataset.flash
    },
    whileTap: reduced ? undefined : { scale: 0.98 },
    ...aria,
  }

  if (to) {
    return (
      <MotionLink ref={ref as Ref<HTMLAnchorElement>} to={to} {...shared}>
        {children}
      </MotionLink>
    )
  }
  if (onClick) {
    return (
      <motion.button ref={ref as Ref<HTMLButtonElement>} type="button" onClick={onClick} {...shared}>
        {children}
      </motion.button>
    )
  }
  const Container = motion[as] as typeof motion.div
  return (
    <Container ref={ref as Ref<HTMLDivElement>} {...shared}>
      {children}
    </Container>
  )
}
