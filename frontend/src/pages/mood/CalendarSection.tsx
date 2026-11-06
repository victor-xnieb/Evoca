import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"

import { EmotionChip } from "@/components/evoca/EmotionChip"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { MoodCalendar, type CalendarDay } from "@/components/evoca/MoodCalendar"
import { TraceCard, TraceCardSkeleton } from "@/components/evoca/TraceCard"
import { Button } from "@/components/ui/button"
import { toIsoDate } from "@/lib/age"
import { formatAverage, formatDate } from "@/lib/format"
import { labelOf, tracesApi, type TraceCatalog } from "@/lib/traces"
import type { Trace } from "@/lib/types"

type MonthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; days: Record<string, CalendarDay>; firstMonth: string }

type DayState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; traces: Trace[] }

const monthKey = (date: Date) => toIsoDate(date).slice(0, 7)

function parseMonth(value: string | null, fallback: Date) {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : new Date(fallback.getFullYear(), fallback.getMonth(), 1)
}

/** HU7: calendario de ánimo por colores con el detalle del día que se toca. */
export function CalendarSection({ catalog, today: todayProp }: { catalog: TraceCatalog | null; today?: Date }) {
  const [now] = useState(() => new Date())
  const today = todayProp ?? now
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const month = parseMonth(params.get("mes"), today)
  const key = monthKey(month)
  const [state, setState] = useState<MonthState>({ status: "loading" })
  const [selected, setSelected] = useState<string | null>(null)
  const [dayState, setDayState] = useState<DayState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const emotionLabel = (value: string) => labelOf(catalog?.emotions ?? [], value)

  useEffect(() => {
    const run = { cancelled: false }
    tracesApi
      .calendar(key)
      .then((data) => {
        if (run.cancelled) return
        const days = Object.fromEntries(
          data.days.map((day) => [
            day.date,
            {
              emotion: day.dominant_emotion,
              emotionLabel: day.dominant_emotion,
              averageIntensity: day.average_intensity,
              count: day.count,
            },
          ]),
        )
        setState({ status: "ready", days, firstMonth: data.first_month })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setState({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [key, attempt])

  useEffect(() => {
    if (!selected) return
    const run = { cancelled: false }
    tracesApi
      .list({ date: selected })
      .then((page) => {
        if (!run.cancelled) setDayState({ status: "ready", traces: page.results })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setDayState({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [selected])

  const goTo = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    const nextParams = new URLSearchParams(params)
    if (monthKey(next) === monthKey(today)) nextParams.delete("mes")
    else nextParams.set("mes", monthKey(next))
    setState({ status: "loading" })
    setSelected(null)
    setParams(nextParams, { replace: true })
  }

  const select = (isoDate: string) => {
    setDayState({ status: "loading" })
    setSelected(isoDate === selected ? null : isoDate)
  }

  const days =
    state.status === "ready"
      ? Object.fromEntries(Object.entries(state.days).map(([date, day]) => [date, { ...day, emotionLabel: emotionLabel(day.emotion) }]))
      : {}
  const selectedDay = selected ? days[selected] : undefined
  const selectedDate = selected ? new Date(`${selected}T12:00:00`) : null

  return (
    <GlassCard as="section" aria-labelledby="calendario" className="flex flex-col gap-5 p-5 sm:p-6">
      <h2 id="calendario" className="text-xl font-semibold">
        Tu calendario
      </h2>

      {state.status === "error" ? (
        <EmptyState
          variant="error"
          compact
          title="No pudimos cargar tu calendario"
          description={state.message}
          action={
            <Button
              className="h-11 rounded-full px-5"
              onClick={() => {
                setState({ status: "loading" })
                setAttempt((value) => value + 1)
              }}
            >
              Reintentar
            </Button>
          }
        />
      ) : (
        <MoodCalendar
          month={month}
          days={days}
          today={today}
          selected={selected}
          onSelect={select}
          loading={state.status === "loading"}
          onPrevious={() => goTo(-1)}
          onNext={() => goTo(1)}
          canGoPrevious={state.status === "ready" && key > state.firstMonth}
          canGoNext={key < monthKey(today)}
          className="mx-auto w-full max-w-md"
        />
      )}

      {selected && selectedDate && (
        <section aria-labelledby="dia-elegido" className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4">
          <h3 id="dia-elegido" className="text-lg font-semibold first-letter:uppercase">
            {formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selectedDay ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <EmotionChip emotion={selectedDay.emotion} label={selectedDay.emotionLabel} size="sm" />
              <span className="font-semibold">Intensidad promedio {formatAverage(selectedDay.averageIntensity)} de 5</span>
              <span className="text-muted-foreground">
                {selectedDay.count} {selectedDay.count === 1 ? "huella" : "huellas"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Este día no tiene registros.</p>
          )}
          {selectedDay && dayState.status === "loading" && <TraceCardSkeleton />}
          {selectedDay && dayState.status === "error" && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {dayState.message}
            </p>
          )}
          {selectedDay && dayState.status === "ready" && (
            <ul aria-label="Huellas del día" className="flex flex-col gap-3">
              {dayState.traces.map((trace) => (
                <li key={trace.id}>
                  <TraceCard
                    trace={trace}
                    sensoryLabel={labelOf(catalog?.sensory_types ?? [], trace.sensory_type)}
                    emotionLabel={emotionLabel(trace.emotion)}
                    onOpen={() => navigate(`/mis-huellas/${trace.id}`)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </GlassCard>
  )
}
