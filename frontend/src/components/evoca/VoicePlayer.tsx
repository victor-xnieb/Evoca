import { Mic } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { formatSeconds, voiceApi } from "@/lib/voice"

type PlayerState = { status: "loading" } | { status: "ready"; url: string } | { status: "error"; message: string }

/**
 * HU16: reproduce la nota de voz de una huella. El audio se pide con la sesión de la persona
 * (nunca es un enlace público) y se libera al salir.
 */
export function VoicePlayer({ traceId, duration }: { traceId: string; duration: number }) {
  const [state, setState] = useState<PlayerState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let url: string | null = null
    voiceApi
      .audio(traceId, controller.signal)
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setState({ status: "ready", url })
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ status: "error", message: error.message })
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [traceId, attempt])

  return (
    <section aria-label="Nota de voz" className="flex flex-col gap-2 rounded-2xl border bg-background/60 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <Mic aria-hidden="true" className="size-4" />
        Nota de voz · {formatSeconds(duration)}
      </p>
      {state.status === "loading" && <div aria-hidden="true" className="h-10 animate-pulse rounded-full bg-secondary" />}
      {state.status === "ready" && (
        // La grabación es de la propia persona y no se transcribe: su nota escrita es la alternativa en texto.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={state.url} className="w-full" aria-label="Escuchar la nota de voz" />
      )}
      {state.status === "error" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="flex-1">No pudimos cargar la nota de voz. {state.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setState({ status: "loading" })
              setAttempt((value) => value + 1)
            }}
          >
            Intentar de nuevo
          </Button>
        </div>
      )}
    </section>
  )
}
