import { CalendarHeart, Flower2, PenLine } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router"

import { AuroraText } from "@/components/evoca/AuroraText"
import { EmotionOrbCluster } from "@/components/evoca/EmotionOrbCluster"
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
      {/* En escritorio la bienvenida y el estado vacío van lado a lado. */}
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <section className="relative isolate flex min-h-[22rem] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[27rem]">
          <Ripple className="-z-10" />
          {/* Halo casi opaco: el texto nunca queda directamente sobre el video del fondo. */}
          <div className="flex flex-col items-center rounded-[2.5rem] bg-background/75 px-6 py-5 backdrop-blur-md">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{greeting()}</p>
            <h1 className="mt-2 font-display text-6xl font-semibold tracking-tight sm:text-7xl">
              <AuroraText>Evoca</AuroraText>
            </h1>
            <p className="mt-3 max-w-sm text-lg text-pretty text-muted-foreground">
              Tu memoria sensorial, un camino para conocerte y cuidar cómo te sientes.
            </p>
          </div>
        </section>

        <div className="rounded-3xl border bg-card/92 shadow-soft backdrop-blur-sm">
          <EmptyState
            visual={<EmotionOrbCluster />}
            title="Aún no tienes huellas"
            description="Cuando registres la primera, aquí verás tus recuerdos más recientes y cómo ha estado tu ánimo."
            action={
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link to="/nueva-huella">Registrar mi primera huella</Link>
              </Button>
            }
          />
        </div>
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
            className="flex gap-3 rounded-2xl border bg-card/92 p-4 backdrop-blur-sm sm:flex-col"
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
