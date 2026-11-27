import { apiBlob, apiRequest } from "./api"
import type { NewTrace } from "./traces"
import type { Trace } from "./types"

/** HU16 · Escenario 1: notas de voz de hasta 60 segundos. */
export const MAX_VOICE_SECONDS = 60

/** Una grabación lista para guardar con la huella. */
export interface VoiceRecording {
  blob: Blob
  /** Segundos. */
  duration: number
}

/**
 * Cómo se pide el micrófono. Los valores por defecto del navegador son para videollamadas: la
 * supresión de ruido corta la voz baja (se oye entrecortada) y la cancelación de eco no hace
 * falta porque mientras se graba no suena nada. El control de volumen sí ayuda con voces bajas.
 */
export const VOICE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
  channelCount: 1,
}

/** Calidad de la grabación: 64 kbps es voz clara; 60 s ocupan ~480 KB (el límite es 1,5 MB). */
export const AUDIO_BITS_PER_SECOND = 64_000

/** Formatos que acepta el servidor, en orden de preferencia (Safari solo graba MP4). */
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]

export function recorderSupported() {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function pickMimeType() {
  return MIME_TYPES.find((type) => window.MediaRecorder.isTypeSupported?.(type)) ?? ""
}

/** «0:07», «1:00». Trunca los segundos, como el reproductor del navegador. */
export function formatSeconds(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds + 0.001))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

export const voiceApi = {
  /** Guarda la huella con su nota de voz en un solo paso (la nota escrita es opcional). */
  createWithVoice: (trace: NewTrace, recording: VoiceRecording) => {
    const form = new FormData()
    form.append("data", JSON.stringify(trace))
    const extension = recording.blob.type.includes("mp4") ? "m4a" : recording.blob.type.includes("ogg") ? "ogg" : "webm"
    form.append("audio", recording.blob, `nota-de-voz.${extension}`)
    form.append("duration", String(Math.min(MAX_VOICE_SECONDS, Math.round(recording.duration * 10) / 10)))
    return apiRequest<Trace>("traces/with-voice/", { method: "POST", form })
  },
  /** El audio de la nota de voz de una huella propia. */
  audio: (traceId: string, signal?: AbortSignal) => apiBlob(`traces/${traceId}/voice/`, signal),
}
