import { animate, motion, useInView, useSpring, type AnimationPlaybackControls } from "motion/react"
import { useEffect, useRef, type CSSProperties } from "react"

import { useFinePointer } from "@/hooks/use-fine-pointer"
import { usePageVisible } from "@/hooks/use-page-visible"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { EMOTION_ORBS } from "@/lib/emotionOrbs"
import { EMOTION_SLUGS, EMOTION_VISUALS, type EmotionSlug } from "@/lib/emotions"
import { cn } from "@/lib/utils"

export type EmotionOrbSize = "sm" | "md" | "lg" | number

/** Lado de la caja en px. La esfera ocupa ~2/3: el margen transparente deja sitio al resplandor. */
const SIZES = { sm: 40, md: 96, lg: 160 } as const

/** Hasta este tamaño basta la imagen de 128 px (cubre pantallas de densidad 3x). */
const SMALL_IMAGE_MAX = 64

/** Distancia (px, desde el borde de la esfera) a la que empieza a notarse el puntero. */
const MAGNET_RANGE = 110
const MAGNET_PULL = 10

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export interface EmotionOrbProps {
  emotion: EmotionSlug
  size?: EmotionOrbSize
  /** Flotación continua. Se apaga con movimiento reducido y fuera de la pantalla. */
  animated?: boolean
  /** Desfase de la flotación (0 a 1). Por defecto depende de la emoción. */
  phase?: number
  /** Se acerca al puntero y rebota al tocarla (solo con `animated`). */
  interactive?: boolean
  /** Si la esfera solo adorna (la emoción ya está escrita al lado), queda oculta a lectores. */
  decorative?: boolean
  /** Carga inmediata para lo que se ve al abrir la pantalla; el resto se carga diferido. */
  priority?: boolean
  className?: string
}

/**
 * Esfera de una emoción con su textura propia y un resplandor del color del token.
 * Con `animated` flota (Motion, solo transform), se acerca al mouse y rebota al tocarla.
 */
export function EmotionOrb({
  emotion,
  size = "md",
  animated = false,
  phase,
  interactive = true,
  decorative = false,
  priority = false,
  className,
}: EmotionOrbProps) {
  const reduced = useReducedMotion()
  const finePointer = useFinePointer()
  const pageVisible = usePageVisible()
  const root = useRef<HTMLSpanElement>(null)
  const floater = useRef<HTMLSpanElement>(null)
  const body = useRef<HTMLSpanElement>(null)
  const ripple = useRef<HTMLSpanElement>(null)
  const inView = useInView(root, { margin: "80px" })

  const px = typeof size === "number" ? size : SIZES[size]
  const asset = EMOTION_ORBS[emotion]
  const offset = phase ?? EMOTION_SLUGS.indexOf(emotion) / EMOTION_SLUGS.length
  const float = animated && !reduced
  const reactive = float && interactive

  // Atracción magnética: resortes que se mueven sin re-renderizar React.
  const pullX = useSpring(0, { stiffness: 120, damping: 14, mass: 0.6 })
  const pullY = useSpring(0, { stiffness: 120, damping: 14, mass: 0.6 })

  // Flotación: se crea con animate() (y no con la prop `animate`) para que no la anule el
  // `AnimatePresence initial={false}` de las rutas, que salta las animaciones de montaje.
  const floating = useRef<AnimationPlaybackControls[]>([])
  useEffect(() => {
    const element = floater.current
    if (!float || !element) return
    const period = 5 + offset * 4 // 5 a 9 s
    const lift = clamp(px * 0.12, 8, 14)
    const drift = clamp(px * 0.05, 3, 6)
    const turn = offset > 0.5 ? 3 : -3
    const loop = (duration: number) => ({ duration, ease: "easeInOut" as const, repeat: Infinity })
    const controls = [
      animate(element, { y: [0, -lift, 0] }, loop(period)),
      animate(element, { x: [0, drift, 0, -drift, 0] }, loop(period * 1.7)),
      animate(element, { rotate: [0, turn, 0, -turn, 0] }, loop(period * 1.4)),
      animate(element, { scale: [1, 1.03, 1] }, loop(period * 0.8)),
    ]
    // Cada esfera empieza en otro punto de su ciclo: nunca se mueven al unísono.
    for (const control of controls) control.time = offset * period
    floating.current = controls
    return () => {
      for (const control of controls) control.stop()
      floating.current = []
    }
  }, [float, offset, px])

  // Pausa fuera de la pantalla o con la pestaña oculta.
  useEffect(() => {
    for (const control of floating.current) {
      if (inView && pageVisible) control.play()
      else control.pause()
    }
  }, [inView, pageVisible, float])

  useEffect(() => {
    const element = root.current
    if (!reactive || !finePointer || !element) return
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      const distance = Math.hypot(dx, dy)
      const reach = rect.width / 3 + MAGNET_RANGE
      const strength = distance < reach && distance > 0 ? (1 - distance / reach) * MAGNET_PULL : 0
      pullX.set(strength ? (dx / distance) * strength : 0)
      pullY.set(strength ? (dy / distance) * strength : 0)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      pullX.set(0)
      pullY.set(0)
    }
  }, [reactive, finePointer, pullX, pullY])

  const bounce = () => {
    if (!reactive || !body.current) return
    animate(body.current, { scale: [1, 1.12, 0.97, 1] }, { duration: 0.5, ease: "easeOut" })
    if (ripple.current) {
      animate(ripple.current, { scale: [0.7, 1.5], opacity: [0.55, 0] }, { duration: 0.7, ease: "easeOut" })
    }
  }

  return (
    <motion.span
      ref={root}
      className={cn("relative inline-block shrink-0", className)}
      style={{
        width: px,
        height: px,
        x: pullX,
        y: pullY,
        ...({
          "--orb-color": EMOTION_VISUALS[emotion].color,
          "--orb-size": `${px}px`,
          "--cursor-accent": EMOTION_VISUALS[emotion].color,
        } as CSSProperties),
      }}
      data-testid="emotion-orb"
      data-floating={float || undefined}
      data-cursor={reactive ? "orb" : undefined}
      onPointerDown={bounce}
    >
      <span ref={floater} className="relative block size-full will-change-transform">
        <span ref={body} className="block size-full">
          <img
            src={px <= SMALL_IMAGE_MAX ? asset.srcSm : asset.src}
            srcSet={`${asset.srcSm} 128w, ${asset.src} 500w`}
            sizes={`${px}px`}
            width={px}
            height={px}
            alt={decorative ? "" : asset.alt}
            aria-hidden={decorative || undefined}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className="evoca-orb size-full select-none"
          />
        </span>
        {/* Onda del color de la emoción al tocarla. */}
        <span
          ref={ripple}
          aria-hidden="true"
          className="pointer-events-none absolute inset-[17%] rounded-full border-2 opacity-0"
          style={{ borderColor: EMOTION_VISUALS[emotion].color }}
        />
      </span>
    </motion.span>
  )
}

export interface StaticEmotionOrbProps {
  emotion: EmotionSlug
  size: number
  decorative?: boolean
  className?: string
}

/**
 * Solo la imagen de la esfera, sin flotación ni atracción al puntero: para listas largas
 * (como el mapa de recuerdos), donde cientos de esferas animadas cansarían al teléfono.
 */
export function StaticEmotionOrb({ emotion, size, decorative = false, className }: StaticEmotionOrbProps) {
  const asset = EMOTION_ORBS[emotion]
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={
        {
          width: size,
          height: size,
          "--orb-color": EMOTION_VISUALS[emotion].color,
          "--orb-size": `${size}px`,
        } as CSSProperties
      }
      data-testid="emotion-orb"
    >
      <img
        src={size <= SMALL_IMAGE_MAX ? asset.srcSm : asset.src}
        srcSet={`${asset.srcSm} 128w, ${asset.src} 500w`}
        sizes={`${size}px`}
        width={size}
        height={size}
        alt={decorative ? "" : asset.alt}
        aria-hidden={decorative || undefined}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="evoca-orb size-full select-none"
      />
    </span>
  )
}
