import { useId, useState, type ReactNode } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual } from "@/lib/emotions"
import { formatAverage, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { EmptyState } from "./EmptyState"

export interface MoodPoint {
  id: string
  /** Fecha y hora ISO del registro real. */
  date: string
  intensity: number
  emotion: string
  emotionLabel: string
}

export interface MoodChartProps {
  points: MoodPoint[]
  average: number | null
  /** Texto del periodo: «esta semana», «este mes». */
  periodLabel: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Acción del estado vacío (por ejemplo, ir a «Nueva huella»). */
  emptyAction?: ReactNode
  className?: string
}

interface ChartDatum extends MoodPoint {
  time: number
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: ChartDatum
}

function EmotionDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null
  const visual = getEmotionVisual(payload.emotion)
  const Icon = visual.icon
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={visual.color} stroke="var(--card)" strokeWidth={2} />
      <Icon x={cx - 6} y={cy - 6} width={12} height={12} color={visual.ink} strokeWidth={2.6} />
    </g>
  )
}

interface TooltipContentProps {
  active?: boolean
  payload?: Array<{ payload: ChartDatum }>
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const datum = active ? payload?.[0]?.payload : undefined
  if (!datum) return null
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lifted">
      <p className="font-semibold">{datum.emotionLabel}</p>
      <p className="text-muted-foreground">
        Intensidad {datum.intensity} de 5 · {formatDate(datum.date, { hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  )
}

/**
 * Gráfica de ánimo: un punto por registro real (color + ícono de su emoción), línea de
 * promedio del periodo, descripción textual y tabla alternativa accesible.
 */
export function MoodChart({
  points,
  average,
  periodLabel,
  loading = false,
  error,
  onRetry,
  emptyAction,
  className,
}: MoodChartProps) {
  const reduced = useReducedMotion()
  const [showTable, setShowTable] = useState(false)
  const summaryId = useId()

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4", className)} aria-busy="true" aria-label="Cargando tu gráfica">
        <div className="h-5 w-48 animate-pulse rounded-full bg-secondary" />
        <div className="h-64 animate-pulse rounded-3xl bg-secondary" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        title="No pudimos cargar tu gráfica"
        description={error}
        action={onRetry && <Button onClick={onRetry}>Intentar de nuevo</Button>}
        className={className}
      />
    )
  }

  if (points.length === 0) {
    return (
      <EmptyState
        title={`Aún no hay registros ${periodLabel}`}
        description="Cuando registres tu primera huella, aquí verás cómo se mueve tu ánimo."
        action={emptyAction}
        className={className}
      />
    )
  }

  const data: ChartDatum[] = points
    .map((point) => ({ ...point, time: new Date(point.date).getTime() }))
    .sort((a, b) => a.time - b.time)

  const summary =
    average === null
      ? `${points.length} registros ${periodLabel}.`
      : `Promedio ${periodLabel}: ${formatAverage(average)} de 5, con ${points.length} ${
          points.length === 1 ? "registro" : "registros"
        }.`

  return (
    <figure className={cn("flex flex-col gap-4", className)} aria-describedby={summaryId}>
      <figcaption id={summaryId} className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-lg font-semibold">{summary}</span>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((value) => !value)} aria-expanded={showTable}>
          {showTable ? "Ver gráfica" : "Ver como tabla"}
        </Button>
      </figcaption>

      {/* La tabla siempre existe para lectores de pantalla; se hace visible a pedido. */}
      <div className={showTable ? "overflow-x-auto rounded-2xl border bg-card" : "sr-only"}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Registros de ánimo {periodLabel}</caption>
          <thead className="bg-secondary">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Fecha</th>
              <th scope="col" className="px-4 py-2 font-semibold">Emoción</th>
              <th scope="col" className="px-4 py-2 font-semibold">Intensidad</th>
            </tr>
          </thead>
          <tbody>
            {data.map((datum) => (
              <tr key={datum.id} className="border-t">
                <td className="px-4 py-2">{formatDate(datum.date, { hour: "numeric", minute: "2-digit" })}</td>
                <td className="px-4 py-2">{datum.emotionLabel}</td>
                <td className="px-4 py-2 tabular-nums">{datum.intensity} de 5</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showTable && (
        <div className="h-64 w-full rounded-3xl border bg-card p-2 pt-4 shadow-soft" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 6" />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(time: number) => formatDate(new Date(time), { day: "numeric", month: "short" })}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 16, right: 16 }}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              {average !== null && (
                <ReferenceLine
                  y={average}
                  stroke="var(--ring)"
                  strokeDasharray="6 6"
                  label={{
                    value: `Promedio ${formatAverage(average)}`,
                    position: "insideTopRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 12,
                  }}
                />
              )}
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
              <Line
                type="monotone"
                dataKey="intensity"
                stroke="var(--foreground)"
                strokeOpacity={0.35}
                strokeWidth={2.5}
                dot={<EmotionDot />}
                activeDot={<EmotionDot />}
                isAnimationActive={!reduced}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  )
}
