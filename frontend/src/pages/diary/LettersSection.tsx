import { Feather } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

import { Envelope } from "@/components/evoca/Envelope"
import { Button } from "@/components/ui/button"
import { diaryApi, type Letter } from "@/lib/diary"

import { letterStatus } from "./letters"

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; letters: Letter[] }

function countLabel(letters: Letter[]) {
  const sealed = letters.filter((letter) => !letter.ready).length
  const arrived = letters.filter((letter) => letter.ready && !letter.opened_at).length
  const total = `Tienes ${letters.length} ${letters.length === 1 ? "carta" : "cartas"}`
  const details = [
    sealed && `${sealed} ${sealed === 1 ? "sellada" : "selladas"}`,
    arrived && `${arrived} ${arrived === 1 ? "lista" : "listas"} para abrir`,
  ].filter(Boolean)
  return details.length ? `${total}: ${details.join(" y ")}.` : `${total}.`
}

/**
 * HU19 · Escenario 3: en el Cuadernillo, mis cartas a mi yo del futuro: cuántas tengo y cuándo
 * se abre cada una, sin su contenido. Desde aquí se escribe una nueva.
 */
export function LettersSection() {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    const run = { cancelled: false }
    diaryApi
      .letters()
      .then((letters) => {
        if (!run.cancelled) setState({ status: "ready", letters })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setState({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [])

  return (
    <section aria-labelledby="cartas" className="flex flex-col gap-4 rounded-3xl bg-background/75 p-4 backdrop-blur-md sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="cartas" className="text-xl font-semibold">
            Cartas a mi yo del futuro
          </h2>
          <p role="status" className="text-sm text-muted-foreground">
            {state.status === "loading" && "Buscando tus cartas…"}
            {state.status === "error" && `No pudimos cargar tus cartas. ${state.message}`}
            {state.status === "ready" &&
              (state.letters.length ? countLabel(state.letters) : "Escribe una carta y elige cuándo abrirla. Hasta ese día queda sellada.")}
          </p>
        </div>
        <Button asChild className="h-11 rounded-full px-5">
          <Link to="/cuadernillo/cartas/nueva">
            <Feather aria-hidden="true" />
            Escribir una carta
          </Link>
        </Button>
      </div>

      {state.status === "ready" && state.letters.length > 0 && (
        <ul aria-label="Mis cartas" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {state.letters.map((letter) => {
            const status = letterStatus(letter)
            return (
              <li key={letter.id}>
                <Link
                  to={`/cuadernillo/cartas/${letter.id}`}
                  aria-label={`Carta ${letter.opened_at ? "abierta" : "sellada"}: ${status}`}
                  className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center focus-visible:outline-3 focus-visible:outline-ring"
                >
                  <Envelope state={letter.opened_at ? "open" : letter.ready ? "ready" : "sealed"} className="max-w-40" />
                  <span className="text-sm font-semibold">{status}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
