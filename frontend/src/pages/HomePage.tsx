import { CalendarHeart, Flower2, PenLine } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router"

import { AuroraText } from "@/components/evoca/AuroraText"
import { EmptyState } from "@/components/evoca/EmptyState"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Ripple } from "@/components/evoca/Ripple"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { greeting } from "@/lib/format"
import { fadeIn, riseIn, staggerContainer } from "@/lib/motion"

const STEPS = [
  {
    icon: Flower2,
    title: "Registra una huella",
    text: "Un aroma, un color, una canción: lo que despertó un recuerdo.",
  },
  {
    icon: PenLine,
    title: "Nombra lo que sentiste",
    text: "Elige una emoción y qué tan intensa fue, en segundos.",
  },
  {
    icon: CalendarHeart,
    title: "Reconoce tus patrones",
    text: "Mira tu ánimo en una gráfica y en un calendario de colores.",
  },
]

export function HomePage() {
  const reduced = useReducedMotion()
  const item = reduced ? fadeIn : riseIn

  return (
    <PageTransition className="gap-8">
      <section className="relative isolate -mx-5 flex min-h-64 flex-col items-center justify-center overflow-hidden px-5 py-10 text-center">
        <Ripple className="-z-10" />
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{greeting()}</p>
        <h1 className="mt-2 font-display text-6xl font-semibold tracking-tight sm:text-7xl">
          <AuroraText>Evoca</AuroraText>
        </h1>
        <p className="mt-3 max-w-sm text-lg text-pretty text-muted-foreground">
          Tu memoria sensorial, un camino para conocerte y cuidar cómo te sientes.
        </p>
      </section>

      <div className="rounded-3xl border bg-card/80 shadow-soft backdrop-blur-sm">
        <EmptyState
          title="Aún no tienes huellas"
          description="Cuando registres la primera, aquí verás tus recuerdos más recientes y cómo ha estado tu ánimo."
          action={
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
              <Link to="/nueva-huella">Registrar mi primera huella</Link>
            </Button>
          }
        />
      </div>

      <motion.ol
        aria-label="Cómo funciona Evoca"
        className="grid gap-3 sm:grid-cols-3"
        variants={staggerContainer(0.08, 0.15)}
        initial="hidden"
        animate="visible"
      >
        {STEPS.map((step, index) => (
          <motion.li
            key={step.title}
            variants={item}
            className="flex gap-3 rounded-2xl border bg-card/70 p-4 sm:flex-col"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
              <step.icon aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">
                <span className="sr-only">Paso {index + 1}: </span>
                {step.title}
              </span>
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </span>
          </motion.li>
        ))}
      </motion.ol>
    </PageTransition>
  )
}
