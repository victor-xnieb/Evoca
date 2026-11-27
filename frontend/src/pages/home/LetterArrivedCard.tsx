import { Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

import { GlassCard } from "@/components/evoca/GlassCard"
import { Button } from "@/components/ui/button"
import { diaryApi, type Letter } from "@/lib/diary"
import { formatDate } from "@/lib/format"

import { arrivedLetters } from "../diary/letters"

/**
 * HU19 · Escenario 2: si llegó la fecha de una carta que aún no abro, al entrar a Inicio aparece
 * un aviso amable para abrir el sobre. Si el Cuadernillo no responde, no se muestra nada.
 */
export function LetterArrivedCard() {
  const [arrived, setArrived] = useState<Letter[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const run = { cancelled: false }
    diaryApi
      .letters()
      .then((letters) => {
        if (!run.cancelled) setArrived(arrivedLetters(letters))
      })
      .catch(() => {})
    return () => {
      run.cancelled = true
    }
  }, [])

  if (dismissed || !arrived.length) return null
  const [first] = arrived
  return (
    <GlassCard accent="gratitud" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-2xl"
        style={{
          background: "color-mix(in oklab, var(--emotion-gratitud) 24%, transparent)",
        }}
      >
        <Mail className="size-6" />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {arrived.length === 1 ? "Llegó una carta de tu yo del pasado" : `Llegaron ${arrived.length} cartas de tu yo del pasado`}
        </h2>
        <p className="text-sm text-muted-foreground">
          La escribiste el {formatDate(first.created_at, { year: "numeric" })}. Ya puedes abrir el sobre.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-11 rounded-full px-5">
          <Link to={`/cuadernillo/cartas/${first.id}`}>Abrir el sobre</Link>
        </Button>
        <Button variant="ghost" className="h-11 rounded-full px-4" onClick={() => setDismissed(true)}>
          Ahora no
        </Button>
      </div>
    </GlassCard>
  )
}
