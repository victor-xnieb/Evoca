import { BookOpen, Feather, Stamp } from "lucide-react"
import { createElement, useEffect, useId, useState } from "react"
import { Link, useNavigate } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/hooks/use-catalog"
import { diaryApi, type Letter, type LetterMoment, type Notebook } from "@/lib/diary"
import { formatDate } from "@/lib/format"
import { getSensoryIcon } from "@/lib/sensory"
import { labelOf } from "@/lib/traces"

import { dayLabel } from "./letters"

/**
 * HU19: «Así estabas cuando la escribiste»: la emoción dominante de ese día, una comparación
 * suave con la de hoy y algunas huellas de esa semana (de tipos distintos).
 */
export function LetterMomentCard({ moment }: { moment: LetterMoment }) {
  const { catalog } = useCatalog()
  const emotions = catalog?.emotions ?? []
  const sensations = catalog?.sensory_types ?? []
  const name = (emotion: string) => labelOf(emotions, emotion)

  return (
    <section aria-labelledby="asi-estabas" className="flex flex-col gap-3 rounded-3xl bg-background/80 p-4 backdrop-blur-md sm:p-5">
      <h2 id="asi-estabas" className="text-lg font-semibold">
        Así estabas cuando la escribiste
      </h2>
      {moment.emotion ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Ese día, {formatDate(`${moment.day}T12:00:00`, { weekday: "long", day: "numeric", month: "long" })}, tu emoción fue
          <EmotionChip emotion={moment.emotion} label={name(moment.emotion)} size="sm" />
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Ese día no registraste huellas.</p>
      )}
      {moment.emotion && moment.today_emotion && (
        <p className="text-sm font-semibold">
          Entonces: {name(moment.emotion)} · Hoy: {name(moment.today_emotion)}
        </p>
      )}
      {moment.traces.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">Esa semana registraste:</p>
          <ul aria-label="Huellas de esa semana" className="flex flex-col gap-2">
            {moment.traces.map((trace) => (
              <li key={trace.id}>
                <Link
                  to={`/mis-huellas/${trace.id}`}
                  className="flex items-start gap-2 rounded-2xl bg-secondary/60 px-3 py-2 text-sm hover:bg-secondary focus-visible:outline-3 focus-visible:outline-ring"
                >
                  {createElement(getSensoryIcon(trace.sensory_type), { "aria-hidden": true, className: "mt-0.5 size-4 shrink-0", strokeWidth: 1.8 })}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span>{trace.note || labelOf(sensations, trace.sensory_type)}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {labelOf(sensations, trace.sensory_type)} ·
                      <EmotionChip emotion={trace.emotion} label={name(trace.emotion)} size="sm" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Esa semana no registraste huellas.</p>
      )}
    </section>
  )
}

/**
 * HU19: al terminar de leer, responderle a mi yo del pasado (una página del Cuadernillo enlazada a
 * la carta) o sellar otra carta que sigue a esta.
 */
export function LetterActions({ letter }: { letter: Letter }) {
  const navigate = useNavigate()
  const choiceId = useId()
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [notebook, setNotebook] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reply = letter.reply

  useEffect(() => {
    if (reply) return
    const run = { cancelled: false }
    diaryApi
      .notebooks()
      .then((items) => {
        if (!run.cancelled) setNotebooks(items)
      })
      .catch(() => {})
    return () => {
      run.cancelled = true
    }
  }, [reply])

  const write = async () => {
    setBusy(true)
    setError(null)
    try {
      const page = await diaryApi.replyLetter(letter.id, notebook || undefined)
      navigate(`/cuadernillo/${page.notebook}?hoja=${page.page}`)
    } catch (problem) {
      setError((problem as Error).message)
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="y-ahora" className="flex flex-col gap-3 rounded-3xl bg-background/80 p-4 backdrop-blur-md sm:p-5">
      <h2 id="y-ahora" className="text-lg font-semibold">
        ¿Y ahora?
      </h2>
      {letter.previous && (
        <p className="text-sm">
          Esta carta sigue a{" "}
          <Link to={`/cuadernillo/cartas/${letter.previous.id}`} className="font-semibold underline underline-offset-4">
            tu carta del {dayLabel(letter.previous.written)}
          </Link>
          .
        </p>
      )}
      {!reply && notebooks.length > 1 && (
        <label htmlFor={choiceId} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Responder en</span>
          <select id={choiceId} value={notebook} onChange={(event) => setNotebook(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-2">
            <option value="">El último en que escribí</option>
            {notebooks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {reply ? (
          <Button asChild className="h-11 rounded-full px-5">
            <Link to={`/cuadernillo/${reply.notebook}?hoja=${reply.page}`}>
              <BookOpen aria-hidden="true" />
              Ver mi respuesta
            </Link>
          </Button>
        ) : (
          <Button className="h-11 rounded-full px-5" onClick={() => void write()} disabled={busy}>
            <Feather aria-hidden="true" />
            {busy ? "Abriendo tu cuaderno…" : "Escribir una respuesta"}
          </Button>
        )}
        <Button asChild variant="outline" className="h-11 rounded-full px-5">
          <Link to={`/cuadernillo/cartas/nueva?desde=${letter.id}`}>
            <Stamp aria-hidden="true" />
            Sellar otra carta
          </Link>
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      {(letter.next_letters ?? []).length > 0 && (
        <ul aria-label="Cartas que sellaste después" className="flex flex-col gap-1 text-sm">
          {letter.next_letters!.map((next) => (
            <li key={next.id}>
              <Link to={`/cuadernillo/cartas/${next.id}`} className="underline underline-offset-4">
                Después sellaste otra carta: {next.ready ? "ya puedes abrirla" : `se abre el ${dayLabel(next.opens_on)}`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
