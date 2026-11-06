import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { MoodData } from "@/lib/traces"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function mood(period: "week" | "month", points: MoodData["points"]): { body: MoodData } {
  const sum = points.reduce((total, point) => total + point.intensity, 0)
  return {
    body: {
      period,
      start: daysAgo(period === "week" ? 7 : 30),
      end: daysAgo(0),
      count: points.length,
      average: points.length ? Math.round((sum / points.length) * 10) / 10 : null,
      points,
    },
  }
}

const WEEK = [
  { id: "a", date: daysAgo(5), intensity: 2, emotion: "tristeza" },
  { id: "b", date: daysAgo(3), intensity: 4, emotion: "calma" },
  { id: "c", date: daysAgo(1), intensity: 5, emotion: "alegria" },
]
const MONTH = [
  { id: "m1", date: daysAgo(25), intensity: 3, emotion: "nostalgia" },
  { id: "m2", date: daysAgo(14), intensity: 1, emotion: "miedo" },
  ...WEEK,
]

/** Filas de la tabla accesible de la gráfica: [emoción, intensidad] por punto. */
function chartRows() {
  const table = screen.getByRole("table", { name: /Registros de ánimo/ })
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").slice(1).map((cell) => cell.textContent))
}

function mockMood(week: MoodData["points"], month: MoodData["points"]) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET traces/mood/": ({ query }) => (query.get("period") === "month" ? mood("month", month) : mood("week", week)),
  })
}

// «Mi ánimo» se carga en diferido junto con Recharts: se importa antes para que las pruebas
// midan la pantalla y no la importación en frío (lenta si el equipo está ocupado).
beforeAll(async () => {
  await import("@/pages/MoodPage")
}, 60_000)

describe("HU4 · Escenario 1: vista semanal y mensual, cada punto es un registro real", () => {
  it("la vista semanal muestra un punto por cada registro de la semana", async () => {
    const fetchMock = mockMood(WEEK, MONTH)
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    // Primera prueba del archivo: jsdom importa en frío la página y Recharts.
    await screen.findByRole("table", { name: /Registros de ánimo/ }, { timeout: 5000 })
    expect(chartRows()).toEqual([
      ["Tristeza", "2 de 5"],
      ["Calma", "4 de 5"],
      ["Alegría", "5 de 5"],
    ])
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("mood/?period=week"))).toBe(true)
    // Leyenda con las emociones del periodo (esfera + nombre: el color nunca va solo).
    const legend = screen.getByRole("list", { name: "Emociones del periodo" })
    expect(within(legend).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Tristeza", "Calma", "Alegría"])
  })

  it("al cambiar a la vista mensual pide el mes y muestra sus registros", async () => {
    const fetchMock = mockMood(WEEK, MONTH)
    const user = userEvent.setup()
    const router = renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    await screen.findByRole("table", { name: /Registros de ánimo/ })
    await user.click(screen.getByRole("tab", { name: "Mes" }))

    await waitFor(() => expect(chartRows()).toHaveLength(5))
    expect(chartRows()[0]).toEqual(["Nostalgia", "3 de 5"])
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("mood/?period=month"))).toBe(true)
    expect(router.state.location.search).toBe("?vista=mes")

    await user.click(screen.getByRole("tab", { name: "Semana" }))
    await waitFor(() => expect(chartRows()).toHaveLength(3))
  })
})

describe("HU4 · Escenario 2: sin registros en el periodo", () => {
  it("invita a registrar la primera huella", async () => {
    mockMood([], [])
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    expect(await screen.findByRole("heading", { name: "Aún no hay registros en los últimos 7 días" })).toBeInTheDocument()
    expect(screen.getByText(/Cuando registres tu primera huella/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar mi primera huella" })).toHaveAttribute("href", "/nueva-huella")
  })
})

describe("HU4 · Escenario 3: promedio del periodo y carga en menos de 2 s", () => {
  it("muestra el promedio del periodo", async () => {
    mockMood(WEEK, MONTH)
    const user = userEvent.setup()
    renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })

    expect(await screen.findByText("Promedio en los últimos 7 días: 3,7 de 5, con 3 registros.")).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Mes" }))
    expect(await screen.findByText("Promedio en los últimos 30 días: 3,0 de 5, con 5 registros.")).toBeInTheDocument()
  })

  it("con 90 días de datos la pantalla queda lista en menos de 2 segundos", async () => {
    const month = Array.from({ length: 120 }, (_, index) => ({
      id: `p${index}`,
      date: daysAgo(index / 4),
      intensity: (index % 5) + 1,
      emotion: EMOTION_OPTIONS[index % 8].value,
    }))
    mockMood(month.slice(0, 28), month)
    const started = performance.now()
    renderApp({ path: "/animo?vista=mes", user: SAMPLE_USER, locked: false })

    await screen.findByText(/Promedio en los últimos 30 días: .* con 120 registros/)
    expect(performance.now() - started).toBeLessThan(2000)
    expect(chartRows()).toHaveLength(120)
  })
})
