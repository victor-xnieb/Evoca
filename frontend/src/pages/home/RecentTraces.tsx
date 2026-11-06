import { CheckCircle2, Plus } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { GlassCard } from "@/components/evoca/GlassCard"
import { TraceCard } from "@/components/evoca/TraceCard"
import { Button } from "@/components/ui/button"
import type { TraceCatalog } from "@/lib/traces"
import { labelOf } from "@/lib/traces"
import type { Trace } from "@/lib/types"

const VISIBLE = 4

interface RecentTracesProps {
  traces: Trace[]
  total: number
  catalog: TraceCatalog | null
  /** Huella recién guardada: se resalta y se confirma. */
  savedTraceId?: string
}

/** Las huellas más recientes en Inicio (HU2: la huella guardada aparece en mi lista). */
export function RecentTraces({ traces, total, catalog, savedTraceId }: RecentTracesProps) {
  const navigate = useNavigate()
  const saved = traces.some((trace) => trace.id === savedTraceId)
  return (
    <GlassCard as="section" accent="calma" aria-labelledby="recientes" className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recientes" className="text-2xl font-semibold">
          Tus huellas recientes
        </h2>
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? "huella" : "huellas"}
        </span>
      </div>
      {saved && (
        <p role="status" className="inline-flex items-center gap-2 rounded-2xl bg-support px-3 py-2 text-sm font-semibold text-support-ink">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Guardaste tu huella.
        </p>
      )}
      <ul className="flex flex-col gap-3" aria-label="Huellas recientes">
        {traces.slice(0, VISIBLE).map((trace) => (
          <li key={trace.id}>
            <TraceCard
              trace={trace}
              sensoryLabel={labelOf(catalog?.sensory_types ?? [], trace.sensory_type)}
              emotionLabel={labelOf(catalog?.emotions ?? [], trace.emotion)}
              className={trace.id === savedTraceId ? "ring-2 ring-(--emotion-calma)" : undefined}
              onOpen={() => navigate(`/mis-huellas/${trace.id}`)}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
          <Link to="/nueva-huella">
            <Plus aria-hidden="true" />
            Registrar otra huella
          </Link>
        </Button>
        {total > VISIBLE && (
          <Button asChild variant="outline" className="h-12 rounded-full px-5">
            <Link to="/mis-huellas">Ver todas</Link>
          </Button>
        )}
      </div>
    </GlassCard>
  )
}
