import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { GlassCard } from "@/components/evoca/GlassCard"
import { MoodChart, type MoodPoint } from "@/components/evoca/MoodChart"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCatalog } from "@/hooks/use-catalog"
import { labelOf, tracesApi, type MoodPeriod } from "@/lib/traces"

const VIEWS: Array<{ value: MoodPeriod; param: string; label: string; periodLabel: string }> = [
  { value: "week", param: "semana", label: "Semana", periodLabel: "en los últimos 7 días" },
  { value: "month", param: "mes", label: "Mes", periodLabel: "en los últimos 30 días" },
]

type Chart =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; points: Omit<MoodPoint, "emotionLabel">[]; average: number | null }

/** HU4: cómo evoluciona mi ánimo, en vista semanal o mensual. */
export function MoodPage() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((item) => item.param === params.get("vista")) ?? VIEWS[0]
  const { catalog } = useCatalog()
  const [chart, setChart] = useState<Chart>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const run = { cancelled: false }
    tracesApi
      .mood(view.value)
      .then((data) => {
        if (!run.cancelled) setChart({ status: "ready", points: data.points, average: data.average })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setChart({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [view.value, attempt])

  const changeView = (param: string) => {
    setChart({ status: "loading" })
    setParams(param === VIEWS[0].param ? {} : { vista: param }, { replace: true })
  }

  const points: MoodPoint[] =
    chart.status === "ready"
      ? chart.points.map((point) => ({ ...point, emotionLabel: labelOf(catalog?.emotions ?? [], point.emotion) }))
      : []
  // Leyenda: las emociones que aparecen en el periodo, con su esfera, color y nombre.
  const legend = [...new Map(points.map((point) => [point.emotion, point.emotionLabel])).entries()]

  return (
    <PageTransition className="mx-auto w-full max-w-3xl gap-6">
      <h1 className="self-start rounded-2xl bg-background/75 px-3 py-1 text-3xl font-semibold backdrop-blur-md">
        Mi ánimo
      </h1>

      <GlassCard as="section" aria-labelledby="grafica" className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="grafica" className="text-xl font-semibold">
            Cómo ha estado tu ánimo
          </h2>
          <Tabs value={view.param} onValueChange={changeView}>
            <TabsList className="h-12 rounded-full p-1" aria-label="Periodo de la gráfica">
              {VIEWS.map((item) => (
                <TabsTrigger key={item.param} value={item.param} className="h-10 rounded-full px-5 text-sm">
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <MoodChart
          points={points}
          average={chart.status === "ready" ? chart.average : null}
          periodLabel={view.periodLabel}
          loading={chart.status === "loading"}
          error={chart.status === "error" ? chart.message : null}
          onRetry={() => {
            setChart({ status: "loading" })
            setAttempt((value) => value + 1)
          }}
          emptyAction={
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
              <Link to="/nueva-huella">Registrar mi primera huella</Link>
            </Button>
          }
        />

        {legend.length > 0 && (
          <ul aria-label="Emociones del periodo" className="flex flex-wrap gap-2">
            {legend.map(([emotion, label]) => (
              <li key={emotion}>
                <EmotionChip emotion={emotion} label={label} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </PageTransition>
  )
}
