import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { toIsoDate } from "@/lib/age"
import type { CalendarData } from "@/lib/traces"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const EMPTY_MOOD = { body: { period: "week", start: "", end: "", count: 0, average: null, points: [] } }

const now = new Date()
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const key = (date: Date) => toIsoDate(date).slice(0, 7)
const day = (month: Date, number: number) => new Date(month.getFullYear(), month.getMonth(), number)
const dayName = (date: Date) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" }).format(date)

const CURRENT: CalendarData = {
  month: key(thisMonth),
  first_month: key(lastMonth),
  days: [
    { date: toIsoDate(day(thisMonth, 1)), dominant_emotion: "calma", average_intensity: 3.3, count: 3 },
    { date: toIsoDate(day(thisMonth, 2)), dominant_emotion: "tristeza", average_intensity: 2, count: 1 },
  ],
}
const PREVIOUS: CalendarData = {
  month: key(lastMonth),
  first_month: key(lastMonth),
  days: [{ date: toIsoDate(day(lastMonth, 10)), dominant_emotion: "alegria", average_intensity: 4.5, count: 2 }],
}

function trace(id: string, emotion: string, level: number, note: string): Trace {
  const when = day(thisMonth, 1).toISOString()
  return { id, sensory_type: "aroma", emotion, mood_intensity: level, note, tags: [], happened_at: when, created_at: when, updated_at: when }
}

function mockCalendar(extra: Record<string, unknown> = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET traces/mood/": EMPTY_MOOD,
    "GET traces/calendar/": ({ query }) => ({ body: query.get("month") === key(lastMonth) ? PREVIOUS : CURRENT }),
    ...extra,
  } as Parameters<typeof mockApi>[0])
}

// La primera prueba importa en frío la página y Recharts: se da más margen.
const calendar = async () => screen.findByRole("grid", { name: /Calendario de ánimo de/ }, { timeout: 5000 })

describe("HU7 · Escenario 1: cada día con el color de su emoción dominante y meses anteriores", () => {
  it("pinta cada día con registros con su emoción dominante (color + ícono + nombre)", async () => {
    mockCalendar()
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    const grid = await calendar()
    const first = await within(grid).findByRole("button", { name: new RegExp(`, ${dayName(day(thisMonth, 1))}: Calma, intensidad promedio 3,3`) })
    expect(first.getAttribute("style")).toContain("--day-color: var(--emotion-calma)")
    expect(first.querySelector("svg")).not.toBeNull()
    expect(within(grid).getByRole("button", { name: new RegExp(`, ${dayName(day(thisMonth, 2))}: Tristeza`) })).toBeInTheDocument()
  })

  it("se puede pasar al mes anterior y volver; no más atrás del primer mes ni después del actual", async () => {
    const fetchMock = mockCalendar()
    const user = userEvent.setup()
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    await calendar()
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole("button", { name: "Mes anterior" })).toBeEnabled())
    await user.click(screen.getByRole("button", { name: "Mes anterior" }))

    const grid = await calendar()
    expect(await within(grid).findByRole("button", { name: new RegExp(`, ${dayName(day(lastMonth, 10))}: Alegría`) })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes(`calendar/?month=${key(lastMonth)}`))).toBe(true)
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }))
    expect(await within(await calendar()).findByRole("button", { name: new RegExp(`, ${dayName(day(thisMonth, 1))}: Calma`) })).toBeInTheDocument()
  })
})

describe("HU7 · Escenario 2: al tocar un día veo su emoción, la intensidad promedio y sus huellas", () => {
  it("muestra el detalle del día con sus huellas", async () => {
    const fetchMock = mockCalendar({
      "GET traces/": ({ query }: { query: URLSearchParams }) => ({
        body: {
          count: 3,
          next: null,
          previous: null,
          results:
            query.get("date") === toIsoDate(day(thisMonth, 1))
              ? [trace("a", "calma", 4, "Café de la mañana"), trace("b", "calma", 3, "El parque"), trace("c", "alegria", 3, "La canción")]
              : [],
        },
      }),
    })
    const user = userEvent.setup()
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    const grid = await calendar()
    await user.click(await within(grid).findByRole("button", { name: new RegExp(`, ${dayName(day(thisMonth, 1))}: Calma`) }))

    const detail = await screen.findByRole("region", { name: new RegExp(dayName(day(thisMonth, 1)), "i") })
    // La emoción dominante encabeza el detalle (también aparece en las huellas de ese día).
    expect(within(detail).getAllByText("Calma")[0]).toBeInTheDocument()
    expect(within(detail).getByText("Intensidad promedio 3,3 de 5")).toBeInTheDocument()
    expect(within(detail).getByText("3 huellas")).toBeInTheDocument()
    const list = await within(detail).findByRole("list", { name: "Huellas del día" })
    expect(within(list).getAllByRole("listitem")).toHaveLength(3)
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes(`traces/?date=${toIsoDate(day(thisMonth, 1))}`))).toBe(true)
    expect(sentBody(fetchMock, "GET traces/")).toBeUndefined()
  })
})

describe("HU7 · Escenario 3: los días sin registros se ven neutros, sin juicio ni alertas", () => {
  it("un día sin registros usa el tono neutro y al tocarlo no muestra alertas", async () => {
    mockCalendar()
    const user = userEvent.setup()
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    const grid = await calendar()
    const empty = await within(grid).findByRole("button", { name: new RegExp(`, ${dayName(day(thisMonth, 3))}: sin registros`) })
    expect(empty.getAttribute("style")).toContain("--day-color: var(--evoca-day-empty)")
    expect(empty.querySelector("svg")).toBeNull()

    await user.click(empty)
    expect(await screen.findByText("Este día no tiene registros.")).toBeInTheDocument()
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    expect(screen.getByText("Los días sin registros se ven en este tono neutro.")).toBeInTheDocument()
  })
})
