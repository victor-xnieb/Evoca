import { createElement, type ReactNode } from "react"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { GlassCard } from "@/components/evoca/GlassCard"
import { getSensoryIcon, type Option } from "@/lib/sensory"
import type { TraceCatalog } from "@/lib/traces"
import { cn } from "@/lib/utils"

const pill = (selected: boolean) =>
  cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-ring",
  )

function FilterRow({
  label,
  allLabel,
  options,
  value,
  onChange,
  renderOption,
}: {
  label: string
  allLabel: string
  options: Option[]
  value: string | null
  onChange: (value: string | null) => void
  renderOption: (option: Option, selected: boolean) => ReactNode
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={value === null} className={pill(value === null)} onClick={() => onChange(null)}>
          {allLabel}
        </button>
        {options.map((option) => renderOption(option, option.value === value))}
      </div>
    </div>
  )
}

export interface SensationEmotionFiltersProps {
  catalog: TraceCatalog
  sensoryType: string | null
  emotion: string | null
  onChange: (name: "tipo" | "emocion", value: string | null) => void
  /** Nombre del primer grupo («Tipo» en Mis huellas, «Sensación» en el mapa). */
  sensoryLabel?: string
}

/** Filtros por tipo sensorial y emoción (HU3 en Mis huellas y HU10 en el mapa de recuerdos). */
export function SensationEmotionFilters({
  catalog,
  sensoryType,
  emotion,
  onChange,
  sensoryLabel = "Tipo",
}: SensationEmotionFiltersProps) {
  return (
    <GlassCard as="section" aria-label="Filtros" className="flex flex-col gap-4 p-5">
      <FilterRow
        label={sensoryLabel}
        allLabel="Todos"
        options={catalog.sensory_types}
        value={sensoryType}
        onChange={(value) => onChange("tipo", value)}
        renderOption={(option, selected) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange("tipo", selected ? null : option.value)}
            className={pill(selected)}
          >
            {createElement(getSensoryIcon(option.value), { "aria-hidden": true, className: "size-4" })}
            {option.label}
          </button>
        )}
      />
      <FilterRow
        label="Emoción"
        allLabel="Todas"
        options={catalog.emotions}
        value={emotion}
        onChange={(value) => onChange("emocion", value)}
        renderOption={(option, selected) => (
          <EmotionChip
            key={option.value}
            emotion={option.value}
            label={option.label}
            size="sm"
            selected={selected}
            onSelect={() => onChange("emocion", selected ? null : option.value)}
            className="min-h-11"
          />
        )}
      />
    </GlassCard>
  )
}
