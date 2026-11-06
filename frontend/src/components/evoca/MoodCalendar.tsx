import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toIsoDate } from "@/lib/age"
import { cn } from "@/lib/utils"

import { DayCell } from "./DayCell"

export interface CalendarDay {
  /** Emoción dominante del día. */
  emotion: string
  emotionLabel: string
  averageIntensity: number
  count: number
}

export interface MoodCalendarProps {
  /** Año y mes que se muestran (el día no importa). */
  month: Date
  /** Días con registros, por fecha AAAA-MM-DD. Los que faltan se ven neutros. */
  days: Record<string, CalendarDay>
  selected?: string | null
  onSelect?: (isoDate: string) => void
  onPrevious?: () => void
  onNext?: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
  loading?: boolean
  /** Fecha de hoy, para marcarla. */
  today: Date
  className?: string
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

/**
 * Calendario de ánimo de un mes: cada día con el color de su emoción dominante (y su
 * ícono, nunca solo color); los días sin registros, en un beige neutro, sin alertas.
 */
export function MoodCalendar({
  month,
  days,
  selected,
  onSelect,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  loading = false,
  today,
  className,
}: MoodCalendarProps) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const total = new Date(year, monthIndex + 1, 0).getDate()
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const title = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(month)
  const todayIso = toIsoDate(today)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full"
          onClick={onPrevious}
          disabled={!canGoPrevious || !onPrevious}
          aria-label="Mes anterior"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h3 className="text-lg font-semibold first-letter:uppercase" aria-live="polite">
          {title}
        </h3>
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full"
          onClick={onNext}
          disabled={!canGoNext || !onNext}
          aria-label="Mes siguiente"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <div role="grid" aria-label={`Calendario de ánimo de ${title}`} aria-busy={loading || undefined} className="flex flex-col gap-1.5">
        <div role="row" className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} role="columnheader" aria-label={weekday} className="text-center text-xs font-semibold text-muted-foreground">
              {weekday.slice(0, 1)}
            </span>
          ))}
        </div>
        <div role="row" className={cn("grid grid-cols-7 gap-1.5 transition-opacity", loading && "opacity-50")}>
          {Array.from({ length: leading }, (_, index) => (
            <span key={`antes-${index}`} aria-hidden="true" />
          ))}
          {Array.from({ length: total }, (_, index) => {
            const date = new Date(year, monthIndex, index + 1)
            const key = toIsoDate(date)
            const day = days[key]
            const position = leading + index
            return (
              <div key={key} role="gridcell">
                <DayCell
                  date={date}
                  emotion={day?.emotion ?? null}
                  emotionLabel={day?.emotionLabel}
                  averageIntensity={day?.averageIntensity ?? null}
                  isToday={key === todayIso}
                  selected={selected === key}
                  wave={{ row: Math.floor(position / 7), column: position % 7 }}
                  onSelect={onSelect ? () => onSelect(key) : undefined}
                />
              </div>
            )
          })}
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true" className="size-4 rounded-md bg-day-empty" />
        Los días sin registros se ven en este tono neutro.
      </p>
    </div>
  )
}
