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

/** `webm`: hay versión WebM (más liviana); se ofrece primero y el MP4 queda de respaldo. */
function video(name: string, { webm = false } = {}): BackgroundMedia {
  const mp4 = { src: media(`${name}.mp4`), type: "video/mp4" }
  return {
    sources: webm ? [{ src: media(`${name}.webm`), type: "video/webm" }, mp4] : [mp4],
    poster: media(`${name}-poster.webp`),
  }
}

/** Fondos animados por tema y orientación. */
export const BACKGROUND_VIDEOS: Record<ResolvedTheme, Record<Orientation, BackgroundMedia>> = {
  light: {
    portrait: video("bg-claro-vertical", { webm: true }),
    landscape: video("bg-claro-horizontal", { webm: true }),
  },
  dark: { portrait: video("bg-oscuro-vertical"), landscape: video("bg-oscuro-horizontal") },
}

/** Imagen fija para movimiento reducido, ahorro de datos y pantallas calmadas (variant="static"). */
export function staticBackground(theme: ResolvedTheme, orientation: Orientation): string {
  return theme === "light" ? staticLight : BACKGROUND_VIDEOS.dark[orientation].poster
}
