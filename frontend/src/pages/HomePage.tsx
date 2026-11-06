import { CalendarHeart, Flower2, PenLine, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router"

import { EmotionOrbCluster } from "@/components/evoca/EmotionOrbCluster"
import { EmptyState } from "@/components/evoca/EmptyState"
import { EvocaWordmark } from "@/components/evoca/EvocaWordmark"
import { GlassCard } from "@/components/evoca/GlassCard"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Ripple } from "@/components/evoca/Ripple"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { EMOTION_VISUALS, type EmotionSlug } from "@/lib/emotions"
import { greeting } from "@/lib/format"
import { fadeIn, riseIn, staggerContainer } from "@/lib/motion"

const STEPS: Array<{ icon: LucideIcon; title: string; text: string; accent: EmotionSlug }> = [
  {
    icon: Flower2,
    title: "Registra una huella",
    text: "Un aroma, un color, una canción: lo que despertó un recuerdo.",
    accent: "calma",
  },
  {
    icon: PenLine,
    title: "Nombra lo que sentiste",
    text: "Elige una emoción y qué tan intensa fue, en segundos.",
    accent: "alegria",
  },
  {
    icon: CalendarHeart,
    title: "Reconoce tus patrones",
    text: "Mira tu ánimo en una gráfica y en un calendario de colores.",
    accent: "tristeza",
  },
]

export function HomePage() {
  const reduced = useReducedMotion()
  const item = reduced ? fadeIn : riseIn

  return (
    <PageTransition className="gap-14 sm:gap-20">
      {/* Foco principal: el saludo y la invitación a registrar. En escritorio, lado a lado. */}
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <section className="relative isolate flex min-h-[19rem] flex-col items-center justify-center px-2 py-8 text-center sm:min-h-[25rem]">
          <Ripple numCircles={4} mainCircleOpacity={0.65} className="-z-10 dark:opacity-65" />
          <GlassCard accent="gratitud" className="flex flex-col items-center px-8 py-7">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{greeting()}</p>
            <h1 className="mt-1 text-6xl sm:text-7xl">
              <EvocaWordmark />
            </h1>
            <p className="mt-3 max-w-sm text-lg text-pretty text-muted-foreground">
              Tu memoria sensorial, un camino para conocerte y cuidar cómo te sientes.
            </p>
          </GlassCard>
        </section>

        <GlassCard accent="calma" cursorLabel="Registrar">
          <EmptyState
            visual={
              <div className="evoca-parallax">
                <EmotionOrbCluster />
              </div>
            }
            title="Aún no tienes huellas"
            description="Cuando registres la primera, aquí verás tus recuerdos más recientes y cómo ha estado tu ánimo."
            action={
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link to="/nueva-huella">Registrar mi primera huella</Link>
              </Button>
            }
          />
        </GlassCard>
      </div>

      {/* Segundo plano: cómo funciona, más pequeño y discreto. */}
      <motion.ol
        aria-label="Cómo funciona Evoca"
        className="grid gap-4 sm:grid-cols-3"
        variants={staggerContainer(0.08, 0.15)}
        initial="hidden"
        animate="visible"
      >
        {STEPS.map((step, index) => (
          <motion.li key={step.title} variants={item}>
            <GlassCard accent={step.accent} className="flex h-full gap-3 rounded-2xl p-4 sm:flex-col">
              <span
                className="evoca-parallax grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ background: `color-mix(in oklab, ${EMOTION_VISUALS[step.accent].color} 24%, transparent)` }}
              >
                <step.icon aria-hidden="true" className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold">
                  <span className="sr-only">Paso {index + 1}: </span>
                  {step.title}
                </span>
                <span className="text-sm text-muted-foreground">{step.text}</span>
              </span>
            </GlassCard>
          </motion.li>
        ))}
      </motion.ol>
    </PageTransition>
  )
}
