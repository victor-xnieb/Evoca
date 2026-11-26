import { createElement } from "react"
import { useReducedMotion } from "motion/react"
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { getSensoryIcon } from "@/lib/sensory"
import { countLabel, type SensationType } from "@/lib/stats"
import { cn } from "@/lib/utils"

export interface SensationBarsProps {
  /** Los seis tipos, de más a menos huellas. */
  types: SensationType[]
  /** Tipo cuyo detalle está abierto. */
  selected?: string | null
  onSelect?: (type: string) => void
  className?: string
}

/**
 * HU13: cuántas huellas registro de cada tipo. La gráfica de barras es solo visual; cada tipo
 * es además un botón con su nombre y su número que abre el detalle (accesible por teclado y
 * lector de pantalla).
 */
export function SensationBars({ types, selected = null, onSelect, className }: SensationBarsProps) {
  const reduced = useReducedMotion()
  const most = Math.max(1, ...types.map((item) => item.count))

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="h-56 w-full rounded-3xl border bg-card p-2 pr-4 shadow-soft" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={types} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 8 }} barCategoryGap={8}>
            <XAxis type="number" hide domain={[0, most]} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={76}
              tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="count"
              radius={[0, 12, 12, 0]}
              isAnimationActive={!reduced}
              animationDuration={700}
              label={{ position: "right", fill: "var(--foreground)", fontSize: 13 }}
              minPointSize={2}
            >
              {types.map((item) => (
                <Cell
                  key={item.type}
                  fill="var(--accent-emotion)"
                  fillOpacity={selected === null || selected === item.type ? 0.9 : 0.35}
                  cursor={onSelect ? "pointer" : undefined}
                  onClick={() => onSelect?.(item.type)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul aria-label="Huellas por tipo" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {types.map((item) => (
          <li key={item.type}>
            <button
              type="button"
              aria-pressed={selected === item.type}
              onClick={() => onSelect?.(item.type)}
              className={cn(
                "flex min-h-12 w-full items-center gap-2.5 rounded-2xl border bg-card px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === item.type && "border-foreground/40 bg-secondary font-semibold",
              )}
            >
              {createElement(getSensoryIcon(item.type), { "aria-hidden": true, className: "size-4 shrink-0", strokeWidth: 1.8 })}
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span>{item.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{countLabel(item.count)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
