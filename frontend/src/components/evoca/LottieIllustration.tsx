import { useContext, useEffect, useRef } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { ThemeContext } from "@/hooks/use-theme"
import { EMOTION_SLUGS } from "@/lib/emotions"
import { cn } from "@/lib/utils"

import type { IllustrationName } from "./lottie/animations"

export interface LottieIllustrationProps {
  name: IllustrationName
  /** Texto alternativo; si la ilustración es decorativa, omítelo. */
  label?: string
  className?: string
}

function readPalette() {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  return {
    emotions: EMOTION_SLUGS.map((slug) => read(`--emotion-${slug}`, "#c98a5b")),
    ink: read("--evoca-ink", "#2b1a12"),
  }
}

/**
 * Ilustración animada con Lottie (reproductor ligero, cargado bajo demanda para no
 * pesar en la carga inicial). Con movimiento reducido se muestra quieta.
 */
export function LottieIllustration({ name, label, className }: LottieIllustrationProps) {
  const container = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const theme = useContext(ThemeContext)?.resolved

  useEffect(() => {
    const run = { cancelled: false, destroy: undefined as (() => void) | undefined }

    Promise.all([import("lottie-web/build/player/lottie_light"), import("./lottie/animations")])
      .then(([{ default: lottie }, { ILLUSTRATIONS }]) => {
        if (run.cancelled || !container.current) return
        const animation = lottie.loadAnimation({
          container: container.current,
          renderer: "svg",
          loop: !reduced,
          autoplay: !reduced,
          animationData: ILLUSTRATIONS[name](readPalette()),
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        })
        if (reduced) animation.goToAndStop(60, true)
        run.destroy = () => animation.destroy()
      })
      .catch(() => {
        // Si el reproductor no carga, la interfaz sigue funcionando sin ilustración.
      })

    return () => {
      run.cancelled = true
      run.destroy?.()
    }
  }, [name, reduced, theme])

  return (
    <div
      ref={container}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("aspect-square w-40", className)}
    />
  )
}
