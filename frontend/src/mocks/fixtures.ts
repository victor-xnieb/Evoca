/**
 * Datos de ejemplo para Storybook y pruebas. Imitan la forma de las respuestas de la API;
 * en la app real las etiquetas y la lista de emociones vienen del backend.
 */
import type { MoodPoint } from "@/components/evoca/MoodChart"
import type { HelpLine } from "@/components/evoca/SupportCard"
import type { EmotionSlug } from "@/lib/emotions"
import type { MemoryEdge, MemoryNode } from "@/lib/memories"
import type { Option, SensoryType } from "@/lib/sensory"
import type { Trace } from "@/lib/types"

export const EMOTION_OPTIONS: Option<EmotionSlug>[] = [
  { value: "alegria", label: "Alegría" },
  { value: "calma", label: "Calma" },
  { value: "gratitud", label: "Gratitud" },
  { value: "nostalgia", label: "Nostalgia" },
  { value: "tristeza", label: "Tristeza" },
  { value: "ansiedad", label: "Ansiedad" },
  { value: "enojo", label: "Enojo" },
  { value: "miedo", label: "Miedo" },
]

export const SENSORY_OPTIONS: Option<SensoryType>[] = [
  { value: "aroma", label: "Aroma" },
  { value: "color", label: "Color" },
  { value: "song", label: "Canción" },
  { value: "flavor", label: "Sabor" },
  { value: "texture", label: "Textura" },
  { value: "place", label: "Lugar" },
]

export const emotionLabel = (value: string) =>
  EMOTION_OPTIONS.find((option) => option.value === value)?.label ?? value

export const sensoryLabel = (value: string) =>
  SENSORY_OPTIONS.find((option) => option.value === value)?.label ?? value

export const FIXED_NOW = new Date("2026-11-05T15:00:00-05:00")

export const SAMPLE_TRACES: Trace[] = [
  {
    id: "7f0d7c58-1a1b-4c55-9d2b-1f0a3c1e0001",
    sensory_type: "aroma",
    note: "El café recién hecho en la cocina de mi abuela, un domingo por la mañana.",
    emotion: "nostalgia",
    mood_intensity: 4,
    tags: ["familia", "mañana"],
    happened_at: null,
    created_at: "2026-11-05T13:10:00-05:00",
    updated_at: "2026-11-05T13:10:00-05:00",
  },
  {
    id: "7f0d7c58-1a1b-4c55-9d2b-1f0a3c1e0002",
    sensory_type: "song",
    note: "Una cumbia sonando en la tienda de la esquina.",
    emotion: "alegria",
    mood_intensity: 5,
    tags: ["barrio"],
    happened_at: null,
    created_at: "2026-11-04T19:40:00-05:00",
    updated_at: "2026-11-04T19:40:00-05:00",
  },
  {
    id: "7f0d7c58-1a1b-4c55-9d2b-1f0a3c1e0003",
    sensory_type: "place",
    note: "La lluvia en la ventana del bus de regreso a casa.",
    emotion: "calma",
    mood_intensity: 3,
    tags: [],
    happened_at: null,
    created_at: "2026-11-02T18:05:00-05:00",
    updated_at: "2026-11-02T18:05:00-05:00",
  },
]

const SAMPLE_EMOTIONS: EmotionSlug[] = ["calma", "alegria", "gratitud", "nostalgia", "ansiedad", "calma", "tristeza"]

export const SAMPLE_MOOD_POINTS: MoodPoint[] = SAMPLE_EMOTIONS.map((emotion, index) => ({
  id: `punto-${index}`,
  date: new Date(FIXED_NOW.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString(),
  intensity: [3, 4, 5, 3, 2, 4, 2][index],
  emotion,
  emotionLabel: emotionLabel(emotion),
}))

/** Borrador: las líneas deben verificarse y aprobarse antes de mostrarse (HU6). */
export const DRAFT_HELP_LINES: HelpLine[] = [
  { name: "Línea 192, opción 4", phone: "192", description: "Salud mental · Ministerio de Salud" },
  { name: "Línea 106", phone: "106", description: "Escucha y orientación en Bogotá" },
  { name: "Línea 123", phone: "123", description: "Emergencias" },
]

/** Recuerdos del mapa (HU10), como los de la cuenta demo de María. */
export const SAMPLE_MEMORIES: MemoryNode[] = ([
  { id: "m-1", name: "Días de calma", explanation: "Momentos tranquilos con colores suaves, lluvia y texturas que abrigan.", emotion: "calma", trace_count: 6, sensory_types: ["aroma", "color", "song", "flavor", "texture"] },
  { id: "m-2", name: "Lo que se fue", explanation: "Lugares, canciones y objetos que traen de vuelta a quienes ya no están cerca.", emotion: "nostalgia", trace_count: 5, sensory_types: ["song", "texture", "place"] },
  { id: "m-3", name: "Fiestas y amigos", explanation: "Música, atardeceres y planes compartidos con amigos.", emotion: "alegria", trace_count: 4, sensory_types: ["song", "color", "place", "texture"] },
  { id: "m-4", name: "Tardes de nervios", explanation: "Situaciones de espera, prisa o peligro que aceleraron el corazón.", emotion: "ansiedad", trace_count: 4, sensory_types: ["aroma", "color", "place"] },
  { id: "m-5", name: "Sabores de la infancia", explanation: "Comidas caseras que recuerdan a la familia.", emotion: "alegria", trace_count: 3, sensory_types: ["aroma", "flavor"] },
  { id: "m-6", name: "La familia y sus abrazos", explanation: "Gestos de la mamá, el papá y la hermana.", emotion: "gratitud", trace_count: 3, sensory_types: ["aroma", "song", "flavor"] },
  { id: "m-7", name: "Una tarde gris", explanation: "", emotion: "tristeza", trace_count: 1, sensory_types: ["color"] },
  { id: "m-8", name: "La calle oscura", explanation: "", emotion: "miedo", trace_count: 2, sensory_types: ["place"] },
] as Omit<MemoryNode, "match">[]).map((memory) => ({ ...memory, match: true }))

/** Conexiones entre esos recuerdos, con su afinidad y motivo (las calcula el servidor). */
export const SAMPLE_MEMORY_EDGES: MemoryEdge[] = [
  { source: "m-5", target: "m-6", score: 0.68, reason: "Comparten aromas, sabores, un tono luminoso y la etiqueta «familia»" },
  { source: "m-2", target: "m-3", score: 0.47, reason: "Comparten canciones, texturas, lugares y la etiqueta «amigos»" },
  { source: "m-1", target: "m-6", score: 0.45, reason: "Comparten aromas, canciones, sabores y un tono luminoso" },
  { source: "m-1", target: "m-3", score: 0.4, reason: "Comparten colores, canciones, texturas y un tono luminoso" },
  { source: "m-7", target: "m-2", score: 0.41, reason: "Comparten un tono melancólico" },
]
