/** Huella tal como la devuelve TraceSerializer (/api/v1/traces/). */
export interface Trace {
  id: string
  sensory_type: string
  note: string
  emotion: string
  mood_intensity: number
  tags: string[]
  happened_at: string | null
  created_at: string
  updated_at: string
}
