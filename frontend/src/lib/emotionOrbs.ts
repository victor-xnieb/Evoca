import alegria from "@/assets/orbs/orb-alegria.webp"
import alegriaSm from "@/assets/orbs/orb-alegria-sm.webp"
import ansiedad from "@/assets/orbs/orb-ansiedad.webp"
import ansiedadSm from "@/assets/orbs/orb-ansiedad-sm.webp"
import calma from "@/assets/orbs/orb-calma.webp"
import calmaSm from "@/assets/orbs/orb-calma-sm.webp"
import enojo from "@/assets/orbs/orb-enojo.webp"
import enojoSm from "@/assets/orbs/orb-enojo-sm.webp"
import gratitud from "@/assets/orbs/orb-gratitud.webp"
import gratitudSm from "@/assets/orbs/orb-gratitud-sm.webp"
import miedo from "@/assets/orbs/orb-miedo.webp"
import miedoSm from "@/assets/orbs/orb-miedo-sm.webp"
import nostalgia from "@/assets/orbs/orb-nostalgia.webp"
import nostalgiaSm from "@/assets/orbs/orb-nostalgia-sm.webp"
import tristeza from "@/assets/orbs/orb-tristeza.webp"
import tristezaSm from "@/assets/orbs/orb-tristeza-sm.webp"

import type { EmotionSlug } from "./emotions"

export interface EmotionOrbAsset {
  /** 500×500 px: tarjetas, ilustraciones y tamaños medianos o grandes. */
  src: string
  /** 128×128 px: chips, listas y leyendas. */
  srcSm: string
  /** Texto alternativo cuando la esfera aporta información. */
  alt: string
}

/**
 * ÚNICO lugar que referencia las imágenes de las esferas (generadas desde diseno/ con
 * `npm run assets`). Para cambiar una esfera basta con regenerar su archivo o tocar este
 * mapa. Las esferas son decoración: los colores de la app siguen saliendo de los tokens.
 */
export const EMOTION_ORBS: Record<EmotionSlug, EmotionOrbAsset> = {
  alegria: { src: alegria, srcSm: alegriaSm, alt: "Esfera de alegría" },
  calma: { src: calma, srcSm: calmaSm, alt: "Esfera de calma" },
  gratitud: { src: gratitud, srcSm: gratitudSm, alt: "Esfera de gratitud" },
  nostalgia: { src: nostalgia, srcSm: nostalgiaSm, alt: "Esfera de nostalgia" },
  tristeza: { src: tristeza, srcSm: tristezaSm, alt: "Esfera de tristeza" },
  ansiedad: { src: ansiedad, srcSm: ansiedadSm, alt: "Esfera de ansiedad" },
  enojo: { src: enojo, srcSm: enojoSm, alt: "Esfera de enojo" },
  miedo: { src: miedo, srcSm: miedoSm, alt: "Esfera de miedo" },
}
