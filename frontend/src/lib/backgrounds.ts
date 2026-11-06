import staticLight from "@/assets/backgrounds/bg-claro-estatico.webp"
import type { ResolvedTheme } from "@/hooks/use-theme"

export type Orientation = "portrait" | "landscape"

export interface VideoSource {
  src: string
  type: string
}

export interface BackgroundMedia {
  /** En orden de preferencia: el navegador usa la primera que pueda reproducir. */
  sources: VideoSource[]
  /** Primer fotograma del video: se ve mientras carga y hace que el cambio no se note. */
  poster: string
}

// Los videos viven en public/media: no pasan por el paquete de JavaScript.
const media = (name: string) => `${import.meta.env.BASE_URL}media/${name}`

function video(name: string): BackgroundMedia {
  return {
    // Si se generan las versiones WebM (npm run assets con ffmpeg), se agregan aquí primero:
    // { src: media(`${name}.webm`), type: "video/webm" },
    sources: [{ src: media(`${name}.mp4`), type: "video/mp4" }],
    poster: media(`${name}-poster.webp`),
  }
}

/** Fondos animados por tema y orientación. */
export const BACKGROUND_VIDEOS: Record<ResolvedTheme, Record<Orientation, BackgroundMedia>> = {
  light: { portrait: video("bg-claro-vertical"), landscape: video("bg-claro-horizontal") },
  dark: { portrait: video("bg-oscuro-vertical"), landscape: video("bg-oscuro-horizontal") },
}

/** Imagen fija para movimiento reducido, ahorro de datos y pantallas calmadas (variant="static"). */
export function staticBackground(theme: ResolvedTheme, orientation: Orientation): string {
  return theme === "light" ? staticLight : BACKGROUND_VIDEOS.dark[orientation].poster
}
