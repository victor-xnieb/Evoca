import { Flower2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { duration, ease } from "@/lib/motion"
import { cn } from "@/lib/utils"

import { EmotionChip } from "./EmotionChip"
import { GlassCard } from "./GlassCard"
import { LottieIllustration } from "./LottieIllustration"

interface Step {
  title: string
  text: string
  example: ReactNode
}

const STEPS: Step[] = [
  {
    title: "1. Elige qué despertó el recuerdo",
    text: "Puede ser un aroma, un color, una canción, un sabor, una textura o un lugar.",
    example: (
      <span className="inline-flex flex-col items-center gap-1.5 rounded-2xl border-2 border-primary bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lifted">
        <Flower2 aria-hidden="true" className="size-7" strokeWidth={1.8} />
        Aroma
      </span>
    ),
  },
  {
    title: "2. Escribe una nota corta",
    text: "Lo justo para reconocerlo después. No hace falta contarlo todo.",
    example: (
      <p className="max-w-xs rounded-2xl border bg-card px-4 py-3 text-left italic shadow-soft">
        «El café de la cocina de mi abuela, un domingo por la mañana.»
      </p>
    ),
  },
  {
    title: "3. Nombra lo que sentiste",
    text: "Elige una emoción y qué tan intensa fue, de 1 a 5. Y listo: en segundos.",
    example: (
      <span className="flex flex-wrap items-center justify-center gap-3">
        <EmotionChip emotion="nostalgia" label="Nostalgia" />
        <span className="rounded-full border bg-card px-3 py-2 text-sm font-semibold shadow-soft">
          Intensidad 4 de 5
        </span>
      </span>
    ),
  },
]

export interface GuidedExampleProps {
  /** Se llama al terminar el ejemplo o al omitirlo. */
  onDone: (skipped: boolean) => void
  className?: string
}

/** Ejemplo guiado de la primera huella (HU2): tres pasos con un ejemplo real que se puede omitir. */
export function GuidedExample({ onDone, className }: GuidedExampleProps) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const last = index === STEPS.length - 1
  const offset = reduced ? 0 : 24

  return (
    <GlassCard as="section" aria-labelledby="ejemplo-titulo" className={cn("flex flex-col gap-5 px-6 py-7", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Tu primera huella</p>
          <h1 id="ejemplo-titulo" className="mt-1 text-2xl font-semibold">
            Así se registra un recuerdo
          </h1>
        </div>
        <Button variant="ghost" className="h-11 shrink-0 rounded-full px-4" onClick={() => onDone(true)}>
          Omitir
        </Button>
      </div>

      <LottieIllustration name="bloom" className="mx-auto w-28" />

      <div className="relative min-h-48" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, x: offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -offset }}
            transition={{ duration: duration.base, ease: ease.outSoft }}
          >
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="max-w-sm text-muted-foreground">{step.text}</p>
            {step.example}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label={`Paso ${index + 1} de ${STEPS.length}`} role="img">
          {STEPS.map((item, dot) => (
            <span
              key={item.title}
              className={cn("h-2 rounded-full transition-all", dot === index ? "w-6 bg-primary" : "w-2 bg-input")}
            />
          ))}
        </div>
        <Button
          size="lg"
          className="h-12 rounded-full px-6 text-base"
          onClick={() => (last ? onDone(false) : setIndex(index + 1))}
        >
          {last ? "Registrar mi huella" : "Siguiente"}
        </Button>
      </div>
    </GlassCard>
  )
}
