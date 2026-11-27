import { ArrowLeft, MailOpen } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, type CSSProperties } from "react"
import { Link, useParams } from "react-router"

import { EmptyState } from "@/components/evoca/EmptyState"
import { Envelope } from "@/components/evoca/Envelope"
import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { GlassCard } from "@/components/evoca/GlassCard"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { diaryApi, fontOf, fontSizeOf, inkVar, type Letter } from "@/lib/diary"
import { formatDate } from "@/lib/format"

import { dayLabel, daysUntil } from "./letters"

import "@fontsource/caveat/400.css"
import "@fontsource/patrick-hand/400.css"
import "@fontsource/kalam/400.css"
import "@fontsource/indie-flower/400.css"
import "@/styles/diary.css"

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; letter: Letter }

const written = (letter: Letter) => formatDate(letter.created_at, { year: "numeric" })

function LetterPaper({ letter, delay }: { letter: Letter; delay: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.article
      aria-label="Tu carta"
      className="diary-paper overflow-hidden rounded-3xl px-6 pt-8 pb-10 sm:px-10"
      style={
        {
          "--diary-ink": inkVar(letter.ink),
          fontFamily: fontOf(letter.font).family,
        } as CSSProperties
      }
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduced ? 0.2 : 0.7,
        delay: reduced ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div aria-hidden="true" className="diary-lines pointer-events-none absolute inset-0" />
      <p className="relative mb-2 font-sans text-sm font-semibold text-(--diary-ink) opacity-80">Escrita el {written(letter)}</p>
      <p
        className="relative whitespace-pre-wrap text-(--diary-ink)"
        style={{
          fontSize: fontSizeOf(letter.font),
          lineHeight: "var(--line-gap)",
        }}
      >
        {letter.content}
      </p>
    </motion.article>
  )
}

/**
 * HU19: una carta. Sellada, solo dice cuándo se abre. Si llegó su fecha, se abre el sobre (la
 * solapa se levanta, el sello se rompe y la carta sale); ya abierta, se puede volver a leer.
 */
export function LetterPage() {
  const { letterId = "" } = useParams()
  const [state, setState] = useState<State>({ status: "loading" })
  const [opening, setOpening] = useState(false)
  const [justOpened, setJustOpened] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = { cancelled: false }
    diaryApi
      .letter(letterId)
      .then((letter) => {
        if (!run.cancelled) setState({ status: "ready", letter })
      })
      .catch((problem: Error) => {
        if (!run.cancelled) setState({ status: "error", message: problem.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [letterId])

  const open = async () => {
    setOpening(true)
    setError(null)
    try {
      const letter = await diaryApi.openLetter(letterId)
      setJustOpened(true)
      setState({ status: "ready", letter })
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      setOpening(false)
    }
  }

  const back = (
    <Link
      to="/cuadernillo"
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-2xl bg-background/75 px-3 text-sm font-semibold text-muted-foreground backdrop-blur-md hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Cuadernillo
    </Link>
  )

  if (state.status === "loading") {
    return (
      <div className="grid min-h-60 place-items-center" role="status" aria-label="Cargando tu carta">
        <EvocaLoader />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <PageTransition className="mx-auto w-full max-w-md gap-4">
        {back}
        <GlassCard>
          <EmptyState variant="error" title="No pudimos traer esta carta" description={state.message} />
        </GlassCard>
      </PageTransition>
    )
  }

  const { letter } = state
  const isOpen = !!letter.content
  const remaining = daysUntil(letter.opens_on)

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-5">
      {back}
      <div className={isOpen ? "mx-auto w-full max-w-56" : "mx-auto w-full max-w-sm"}>
        <Envelope state={isOpen ? "open" : letter.ready ? "ready" : "sealed"} />
      </div>

      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div key="carta" className="flex flex-col gap-3">
            <h1 className="self-center rounded-2xl bg-background/75 px-3 py-1 text-center text-2xl font-semibold backdrop-blur-md">
              Tu carta del {written(letter)}
            </h1>
            <LetterPaper letter={letter} delay={justOpened ? 0.8 : 0} />
          </motion.div>
        ) : (
          <motion.div
            key="sobre"
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 rounded-3xl bg-background/80 px-5 py-4 text-center backdrop-blur-md"
          >
            <h1 className="text-2xl font-semibold">{letter.ready ? "Llegó tu carta" : "Carta sellada"}</h1>
            <p className="text-base">
              {letter.ready
                ? `La escribiste el ${written(letter)}. Ya puedes abrir el sobre.`
                : `Se abre el ${dayLabel(letter.opens_on)}. ${remaining === 1 ? "Falta 1 día" : `Faltan ${remaining} días`}.`}
            </p>
            {!letter.ready && <p className="text-sm text-muted-foreground">La escribiste el {written(letter)}. Hasta ese día nadie puede leerla.</p>}
            {letter.ready && (
              <Button size="lg" className="h-12 rounded-full px-6 text-base" onClick={() => void open()} disabled={opening}>
                <MailOpen aria-hidden="true" />
                {opening ? "Abriendo…" : "Abrir el sobre"}
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
