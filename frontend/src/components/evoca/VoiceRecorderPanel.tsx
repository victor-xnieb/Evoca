import { Mic, MicOff, RotateCcw, Square, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { RecorderState } from "@/hooks/use-voice-recorder"
import { cn } from "@/lib/utils"
import { formatSeconds, MAX_VOICE_SECONDS } from "@/lib/voice"

export interface VoiceRecorderPanelProps {
  state: RecorderState
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
  /** HU16 · Escenario 3: sin micrófono, ir a escribir la nota. */
  onWriteInstead: () => void
  className?: string
}

/**
 * HU16: grabadora de la nota de voz. Graba hasta 60 segundos, deja escucharla antes de guardar
 * y, si no hay permiso para el micrófono, explica por qué se necesita y ofrece escribir la nota.
 */
export function VoiceRecorderPanel({ state, onStart, onStop, onDiscard, onWriteInstead, className }: VoiceRecorderPanelProps) {
  return (
    <section aria-label="Nota de voz" className={cn("flex flex-col gap-3 rounded-2xl border bg-background/60 p-4", className)}>
      {(state.status === "idle" || state.status === "requesting") && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" className="h-11 rounded-full px-5" disabled={state.status === "requesting"} onClick={onStart}>
            <Mic aria-hidden="true" />
            {state.status === "requesting" ? "Esperando el micrófono…" : "Grabar nota de voz"}
          </Button>
          <p className="text-sm text-muted-foreground">Hasta {MAX_VOICE_SECONDS} segundos. Si grabas, no hace falta escribir.</p>
        </div>
      )}

      {state.status === "recording" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true" className="size-3 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" />
            <p className="font-semibold tabular-nums" role="status">
              Grabando {formatSeconds(state.seconds)} de {formatSeconds(MAX_VOICE_SECONDS)}
            </p>
            <Button type="button" className="ml-auto h-11 rounded-full px-5" onClick={onStop}>
              <Square aria-hidden="true" />
              Detener
            </Button>
          </div>
          <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <span
              className="block h-full rounded-full bg-destructive transition-[width] duration-200"
              style={{ width: `${Math.min(100, (state.seconds / MAX_VOICE_SECONDS) * 100)}%` }}
            />
          </span>
          <p className="text-xs text-muted-foreground">Se detiene sola al llegar a {MAX_VOICE_SECONDS} segundos.</p>
        </div>
      )}

      {state.status === "recorded" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Tu nota de voz ({formatSeconds(state.recording.duration)}). Escúchala antes de guardar:</p>
          {/* La grabación es de la propia persona y no se transcribe: su nota escrita es la alternativa en texto. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={state.url} className="w-full" aria-label="Escuchar tu nota de voz" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-full px-4" onClick={onStart}>
              <RotateCcw aria-hidden="true" />
              Volver a grabar
            </Button>
            <Button type="button" variant="ghost" className="h-11 rounded-full px-4" onClick={onDiscard}>
              <Trash2 aria-hidden="true" />
              Quitar la nota de voz
            </Button>
          </div>
        </div>
      )}

      {state.status === "denied" && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-support p-3 text-sm text-support-ink">
          <p className="flex items-start gap-2">
            <MicOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              Para grabar, Evoca necesita permiso para usar tu micrófono: así guarda tu voz en esta huella, solo para ti. Puedes
              permitirlo en la configuración de tu navegador o escribir la nota.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 rounded-full px-5" onClick={onWriteInstead}>
              Escribir la nota
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-full px-4" onClick={onStart}>
              Intentar de nuevo
            </Button>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="flex-1">{state.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={onStart}>
            Intentar de nuevo
          </Button>
        </div>
      )}

      {state.status === "unsupported" && (
        <p className="text-sm text-muted-foreground">Este navegador no permite grabar audio. Puedes escribir la nota.</p>
      )}
    </section>
  )
}
