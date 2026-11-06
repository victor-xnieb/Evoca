import { AnimatePresence, motion, useIsPresent } from "motion/react"
import { useContext, useEffect, useRef, useState } from "react"

import { useOrientation } from "@/hooks/use-orientation"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useSaveData } from "@/hooks/use-save-data"
import { ThemeContext, type ResolvedTheme } from "@/hooks/use-theme"
import { BACKGROUND_VIDEOS, staticBackground, type BackgroundMedia, type Orientation } from "@/lib/backgrounds"
import { duration } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface AnimatedBackgroundProps {
  /**
   * "static" nunca carga video (por ejemplo, la pantalla de orientación y ayuda de HU6,
   * que debe ser calmada y sin movimiento).
   */
  variant?: "animated" | "static"
  /** Solo para Storybook y pruebas: fija la orientación en vez de leer la pantalla. */
  orientation?: Orientation
  className?: string
}

/** Espera a que el navegador esté ocioso para no competir con el primer pintado ni con los datos. */
function useIdle(enabled: boolean): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!enabled || idle) return
    // Safari no tiene requestIdleCallback: se usa una espera corta.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(() => setIdle(true), 300)
    return () => window.clearTimeout(id)
  }, [enabled, idle])

  return idle
}

interface LayerProps {
  image: string
  video?: BackgroundMedia
}

function BackgroundLayer({ image, video }: LayerProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const isPresent = useIsPresent()

  // Pausa con la pestaña oculta y al salir (durante el fundido nunca suenan dos videos a la vez).
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const sync = () => {
      if (document.hidden || !isPresent) element.pause()
      else element.play()?.catch(() => {})
    }
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [isPresent, video])

  return (
    <motion.div
      className="evoca-bg-layer absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.slow }}
    >
      <img
        src={image}
        alt=""
        decoding="async"
        fetchPriority="low"
        className="evoca-bg-media absolute inset-0 size-full object-cover"
      />
      {video && (
        <video
          ref={(element) => {
            ref.current = element
            // React no refleja `muted` como atributo; algunos navegadores lo exigen para autoplay.
            if (!element) return
            element.defaultMuted = true
            element.muted = true
          }}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="metadata"
          poster={video.poster}
          tabIndex={-1}
          className="evoca-bg-media absolute inset-0 size-full object-cover"
        >
          {video.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>
      )}
    </motion.div>
  )
}

/**
 * Fondo vivo de toda la app, detrás del contenido: video claro u oscuro según el tema y
 * vertical u horizontal según la pantalla. Primero se ve una imagen fija; el video se monta
 * cuando el navegador está ocioso. Con movimiento reducido, ahorro de datos o
 * variant="static" se queda en la imagen fija.
 */
export function AnimatedBackground({ variant = "animated", orientation, className }: AnimatedBackgroundProps) {
  const theme: ResolvedTheme = useContext(ThemeContext)?.resolved ?? "light"
  const screenOrientation = useOrientation()
  const current = orientation ?? screenOrientation
  const reduced = useReducedMotion()
  const saveData = useSaveData()
  const wantsVideo = variant === "animated" && !reduced && !saveData
  const idle = useIdle(wantsVideo)
  const video = wantsVideo && idle ? BACKGROUND_VIDEOS[theme][current] : undefined
  const image = wantsVideo ? BACKGROUND_VIDEOS[theme][current].poster : staticBackground(theme, current)

  return (
    <div
      aria-hidden="true"
      data-testid="animated-background"
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none", className)}
    >
      <AnimatePresence initial={false}>
        <BackgroundLayer key={`${theme}-${current}-${video ? "video" : "image"}`} image={image} video={video} />
      </AnimatePresence>
      <div className="evoca-video-scrim absolute inset-0" />
    </div>
  )
}
