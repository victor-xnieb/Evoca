import { Check, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { INTENSITY_LABELS } from "@/lib/messages"
import { fadeIn, riseIn } from "@/lib/motion"

import { EmotionChip } from "./EmotionChip"

export interface SuggestionCardProps {
  /** Mientras la IA lee la nota. */
  loading?: boolean
  /** Sugerencia vigente; sin ella (y sin carga) la tarjeta no se muestra. */
  suggestion?: { emotion: string; emotionLabel: string; intensity: number } | null
  /** La emoción y la intensidad elegidas ya coinciden con la sugerencia. */
  applied?: boolean
  onAccept?: () => void
  className?: string
}

/**
 * Sugerencia de emoción e intensidad hecha por la IA a partir de la nota (HU8). Es solo una
 * propuesta: se usa con un toque y se puede cambiar; lo que se guarda es lo que elige la persona.
 */
export function SuggestionCard({ loading = false, suggestion, applied = false, onAccept, className }: SuggestionCardProps) {
  const reduced = useReducedMotion()
  const variants = reduced ? fadeIn : riseIn

  return (
    <div aria-live="polite" className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {suggestion ? (
          <motion.section
            key={`${suggestion.emotion}-${suggestion.intensity}`}
            aria-label="Sugerencia de la IA"
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles aria-hidden="true" className="size-4" />
              Sugerencia de la IA
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <EmotionChip emotion={suggestion.emotion} label={suggestion.emotionLabel} size="sm" />
              <span className="text-sm">
                Intensidad {suggestion.intensity} · {INTENSITY_LABELS[suggestion.intensity - 1]}
              </span>
              {applied ? (
                <span className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
                  <Check aria-hidden="true" className="size-4" />
                  En uso: puedes cambiarla abajo
                </span>
              ) : (
                <Button type="button" variant="secondary" className="ml-auto h-11 rounded-full px-5" onClick={onAccept}>
                  Usar sugerencia
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              La propone una IA (Google Gemini) a partir de tu nota. Se guarda lo que tú elijas.
            </p>
          </motion.section>
        ) : loading ? (
          <motion.p
            key="cargando"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            La IA está leyendo tu nota…
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
