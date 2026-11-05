import { Flower2, Hand, MapPin, Music, Palette, Soup, type LucideIcon } from "lucide-react"

/** Tipos sensoriales de Trace.SensoryType en el backend. Las etiquetas llegan de la API. */
export const SENSORY_TYPES = ["aroma", "color", "song", "flavor", "texture", "place"] as const

export type SensoryType = (typeof SENSORY_TYPES)[number]

export const SENSORY_ICONS: Record<SensoryType, LucideIcon> = {
  aroma: Flower2,
  color: Palette,
  song: Music,
  flavor: Soup,
  texture: Hand,
  place: MapPin,
}

export function getSensoryIcon(type: string): LucideIcon {
  return (SENSORY_ICONS as Record<string, LucideIcon>)[type] ?? Flower2
}

export interface Option<T extends string = string> {
  value: T
  label: string
}
