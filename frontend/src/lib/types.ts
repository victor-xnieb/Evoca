/** Huella tal como la devuelve TraceSerializer (/api/v1/traces/). */
export interface Trace {
  id: string
  sensory_type: string
  note: string
  emotion: string
  mood_intensity: number
  tags: string[]
  happened_at: string | null
  /** HU16: segundos de su nota de voz, o null si no tiene. */
  voice_duration?: number | null
  created_at: string
  updated_at: string
}
