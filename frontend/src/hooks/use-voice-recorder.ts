import { useCallback, useEffect, useRef, useState } from "react"

import {
  AUDIO_BITS_PER_SECOND,
  MAX_VOICE_SECONDS,
  pickMimeType,
  recorderSupported,
  VOICE_CONSTRAINTS,
  type VoiceRecording,
} from "@/lib/voice"

export type RecorderState =
  | { status: "idle" }
  | { status: "unsupported" }
  | { status: "requesting" }
  | { status: "recording"; seconds: number }
  | { status: "recorded"; recording: VoiceRecording; url: string }
  /** HU16 · Escenario 3: no hay permiso para el micrófono. */
  | { status: "denied" }
  | { status: "error"; message: string }

/**
 * HU16: grabar una nota de voz con MediaRecorder, de hasta 60 segundos (se detiene sola).
 * La grabación queda en el dispositivo hasta que se guarda la huella.
 */
export function useVoiceRecorder(onChange: (recording: VoiceRecording | null) => void) {
  const [state, setState] = useState<RecorderState>(() => (recorderSupported() ? { status: "idle" } : { status: "unsupported" }))
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const url = useRef<string | null>(null)
  const notify = useRef(onChange)
  useEffect(() => {
    notify.current = onChange
  })

  const release = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }, [])

  const forget = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = null
  }, [])

  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop()
      release()
      forget()
    },
    [release, forget],
  )

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    forget()
    notify.current(null)
    setState({ status: "requesting" })
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: VOICE_CONSTRAINTS })
    } catch (error) {
      const name = (error as DOMException).name
      if (name === "NotAllowedError" || name === "SecurityError") return setState({ status: "denied" })
      return setState({
        status: "error",
        message:
          name === "NotFoundError"
            ? "No encontramos un micrófono en este dispositivo. Puedes escribir la nota."
            : "No pudimos usar el micrófono. Puedes escribir la nota.",
      })
    }
    const mimeType = pickMimeType()
    const media = new MediaRecorder(stream.current, {
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      ...(mimeType ? { mimeType } : {}),
    })
    const chunks: Blob[] = []
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    media.onstop = () => {
      const duration = Math.min(MAX_VOICE_SECONDS, (Date.now() - startedAt.current) / 1000)
      release()
      const blob = new Blob(chunks, { type: media.mimeType || mimeType || "audio/webm" })
      if (!blob.size || duration < 0.5) {
        setState({ status: "error", message: "La grabación quedó vacía. Inténtalo de nuevo." })
        return
      }
      url.current = URL.createObjectURL(blob)
      const recording = { blob, duration }
      setState({ status: "recorded", recording, url: url.current })
      notify.current(recording)
    }
    recorder.current = media
    startedAt.current = Date.now()
    media.start()
    setState({ status: "recording", seconds: 0 })
    timer.current = window.setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000
      if (seconds >= MAX_VOICE_SECONDS) {
        stop()
        return
      }
      setState({ status: "recording", seconds })
    }, 250)
  }, [forget, release, stop])

  const discard = useCallback(() => {
    forget()
    notify.current(null)
    setState({ status: "idle" })
  }, [forget])

  return { state, start, stop, discard }
}
