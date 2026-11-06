import {
  Activity,
  CloudRain,
  Flame,
  Ghost,
  Heart,
  Hourglass,
  Leaf,
  Sun,
  type LucideIcon,
} from "lucide-react"

/**
 * Identificadores de emoción que valida el backend. La lista y las etiquetas visibles
 * se obtienen de la API; aquí solo vive la parte visual (color e ícono) de cada una.
 */
export const EMOTION_SLUGS = [
  "alegria",
  "calma",
  "gratitud",
  "nostalgia",
  "tristeza",
  "ansiedad",
  "enojo",
  "miedo",
] as const

export type EmotionSlug = (typeof EMOTION_SLUGS)[number]

export interface EmotionVisual {
  /** Variable CSS del color de superficie (definida en styles/tokens.css). */
  color: string
  /** Variable CSS del color de texto legible sobre la superficie. */
  ink: string
  icon: LucideIcon
  /** Enojo usa texto en negrita porque su contraste es el más justo de la paleta. */
  bold?: boolean
}

export const EMOTION_VISUALS: Record<EmotionSlug, EmotionVisual> = {
  alegria: { color: "var(--emotion-alegria)", ink: "var(--emotion-alegria-ink)", icon: Sun },
  calma: { color: "var(--emotion-calma)", ink: "var(--emotion-calma-ink)", icon: Leaf },
  gratitud: { color: "var(--emotion-gratitud)", ink: "var(--emotion-gratitud-ink)", icon: Heart },
  nostalgia: {
    color: "var(--emotion-nostalgia)",
    ink: "var(--emotion-nostalgia-ink)",
    icon: Hourglass,
  },
  tristeza: {
    color: "var(--emotion-tristeza)",
    ink: "var(--emotion-tristeza-ink)",
    icon: CloudRain,
  },
  ansiedad: {
    color: "var(--emotion-ansiedad)",
    ink: "var(--emotion-ansiedad-ink)",
    icon: Activity,
  },
  enojo: { color: "var(--emotion-enojo)", ink: "var(--emotion-enojo-ink)", icon: Flame, bold: true },
  miedo: { color: "var(--emotion-miedo)", ink: "var(--emotion-miedo-ink)", icon: Ghost },
}

export function isEmotionSlug(value: string): value is EmotionSlug {
  return (EMOTION_SLUGS as readonly string[]).includes(value)
}

/** Devuelve la parte visual de una emoción; si llega un valor desconocido usa un neutro. */
export function getEmotionVisual(emotion: string): EmotionVisual {
  if (isEmotionSlug(emotion)) return EMOTION_VISUALS[emotion]
  return { color: "var(--evoca-day-empty)", ink: "var(--evoca-day-empty-ink)", icon: Leaf }
}
