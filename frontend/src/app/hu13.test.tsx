import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { SensationStats } from "@/lib/stats"
import { EMOTION_OPTIONS, SAMPLE_SENSATION_STATS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, type MockReply } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const BASE = {
  "GET traces/catalog/": { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } },
  "GET traces/mood/": { body: { period: "week", start: "", end: "", count: 0, average: null, points: [] } },
  "GET traces/calendar/": { body: { month: "2026-11", first_month: "2026-11", days: [] } },
}

const TOTAL: SensationStats = {
  ...SAMPLE_SENSATION_STATS,
  period: "all",
  count: 137,
  average_mood: 4.1,
  top_elements: [{ name: "café", type: "aroma", count: 7, average_mood: 4.3 }, ...SAMPLE_SENSATION_STATS.top_elements.slice(1)],
}

const NOT_READY = (total: number): SensationStats => ({
  ...SAMPLE_SENSATION_STATS,
  total,
  missing: 10 - total,
  ready: false,
  count: 0,
  average_mood: null,
  types: [],
  top_elements: [],
})

type StatsHandler = MockReply | ((request: { body: unknown; query: URLSearchParams }) => MockReply)

function mockStats(stats: StatsHandler, extract?: StatsHandler) {
  return mockApi({
    ...BASE,
    "GET traces/stats/": stats,
    ...(extract ? { "POST traces/stats/elements/": extract } : {}),
  })
}

async function openSection() {
  renderApp({ path: "/animo", user: SAMPLE_USER, locked: false })
  return screen.findByRole("region", { name: "Mis sensaciones" }, { timeout: 5000 })
}

const names = (list: HTMLElement) =>
  within(list)
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".truncate")?.textContent)

// «Mi ánimo» se carga en diferido junto con Recharts: se importa antes para no medir la importación.
beforeAll(async () => {
  await import("@/pages/MoodPage")
}, 60_000)

describe("HU13 · Escenario 1: cuántas huellas por tipo y los 5 elementos más frecuentes", () => {
  it("muestra las huellas de cada tipo y los 5 elementos de los últimos 30 días", async () => {
    const fetchMock = mockStats(({ query }) => ({ body: query.get("period") === "all" ? TOTAL : SAMPLE_SENSATION_STATS }))
    const section = await openSection()

    expect(await within(section).findByText("En los últimos 30 días registraste 32 huellas, con un ánimo promedio de 4,0 de 5.")).toBeInTheDocument()
    const types = within(section).getByRole("list", { name: "Huellas por tipo" })
    expect(within(types).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Aroma9 huellas",
      "Canción6 huellas",
      "Textura5 huellas",
      "Lugar5 huellas",
      "Sabor4 huellas",
      "Color3 huellas",
    ])
    const top = within(section).getByRole("list", { name: "Los 5 elementos que más registras" })
    expect(names(top)).toEqual(["Café", "Salsa", "Lluvia", "Cobija", "Parque"])
    expect(within(top).getAllByRole("listitem")[0]).toHaveTextContent("Aroma · 4 huellas · ánimo 4,0 de 5")
    // Abrir las estadísticas no pide a la IA reconocer nada si ya está todo listo.
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("cambia a «Total» para ver todas las huellas", async () => {
    const fetchMock = mockStats(({ query }) => ({ body: query.get("period") === "all" ? TOTAL : SAMPLE_SENSATION_STATS }))
    const section = await openSection()
    await within(section).findByText(/^En los últimos 30 días/)

    await userEvent.click(within(section).getByRole("tab", { name: "Total" }))

    expect(await within(section).findByText("En total registraste 137 huellas, con un ánimo promedio de 4,1 de 5.")).toBeInTheDocument()
    expect(within(section).getByRole("list", { name: "Los 5 elementos que más registras" })).toHaveTextContent("Aroma · 7 huellas")
    expect(fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("stats/"))).toEqual([
      expect.stringContaining("period=month"),
      expect.stringContaining("period=all"),
    ])
  })

  it("sin huellas en los últimos 30 días invita a ver el total", async () => {
    mockStats(({ query }) => ({
      body: query.get("period") === "all" ? TOTAL : { ...SAMPLE_SENSATION_STATS, count: 0, average_mood: null, top_elements: [] },
    }))
    const section = await openSection()

    expect(await within(section).findByRole("heading", { name: "No registraste huellas en los últimos 30 días" })).toBeInTheDocument()
    await userEvent.click(within(section).getByRole("button", { name: "Ver el total" }))
    expect(await within(section).findByText(/^En total registraste 137 huellas/)).toBeInTheDocument()
    expect(within(section).getByRole("tab", { name: "Total" })).toHaveAttribute("aria-selected", "true")
  })
})

describe("HU13 · Escenario 2: el ánimo de cada tipo, como observación y no como diagnóstico", () => {
  it("al tocar un tipo muestra su ánimo promedio comparado con el general y sus elementos", async () => {
    mockStats({ body: SAMPLE_SENSATION_STATS })
    const section = await openSection()
    const aroma = await within(section).findByRole("button", { name: /^Aroma/ })

    await userEvent.click(aroma)

    expect(aroma).toHaveAttribute("aria-pressed", "true")
    const detail = within(section).getByRole("region", { name: "Aroma · 9 huellas" })
    expect(detail).toHaveTextContent(
      "En tus huellas de aroma, tu ánimo promedio fue 4,4 de 5, un poco más alto que tu promedio general (4,0). Es una observación de tus registros, no un diagnóstico.",
    )
    expect(names(within(detail).getByRole("list", { name: "Lo que más registras de aroma" }))).toEqual(["Café", "Lluvia", "Perfume"])
    // En el detalle no se repite el tipo en cada elemento.
    expect(within(detail).getAllByRole("listitem")[0]).toHaveTextContent(/^1Café4 huellas · ánimo/)
  })

  it("dice si el ánimo es más bajo o parecido, y se cierra al tocarlo otra vez", async () => {
    mockStats({ body: SAMPLE_SENSATION_STATS })
    const section = await openSection()

    await userEvent.click(await within(section).findByRole("button", { name: /^Lugar/ }))
    expect(within(section).getByRole("region", { name: "Lugar · 5 huellas" })).toHaveTextContent("un poco más bajo que tu promedio general (4,0)")

    await userEvent.click(within(section).getByRole("button", { name: /^Textura/ }))
    expect(within(section).getByRole("region", { name: "Textura · 5 huellas" })).toHaveTextContent("parecido a tu promedio general (4,0)")

    await userEvent.click(within(section).getByRole("button", { name: /^Textura/ }))
    expect(within(section).queryByRole("region", { name: /Textura/ })).not.toBeInTheDocument()
    expect(within(section).getByText("Toca un tipo para ver su detalle y el ánimo que lo acompaña.")).toBeInTheDocument()
  })

  it("nunca habla de diagnóstico como algo que la app hace", async () => {
    mockStats({ body: SAMPLE_SENSATION_STATS })
    const section = await openSection()
    await within(section).findByText(/^En los últimos 30 días/)
    for (const type of ["Aroma", "Canción", "Textura", "Lugar", "Sabor", "Color"]) {
      await userEvent.click(within(section).getByRole("button", { name: new RegExp(`^${type}`) }))
      const detail = within(section).getByRole("region", { name: new RegExp(`^${type} ·`) })
      expect(within(detail).getByText(/Es una observación de tus registros, no un diagnóstico\.$/)).toBeInTheDocument()
    }
  })
})

describe("HU13 · Escenario 3: con menos de 10 huellas dice cuántas faltan", () => {
  it("con 7 huellas dice que faltan 3 y lleva a registrar una", async () => {
    const fetchMock = mockStats({ body: NOT_READY(7) })
    const section = await openSection()

    expect(await within(section).findByRole("heading", { name: "Te faltan 3 huellas para ver tus estadísticas" })).toBeInTheDocument()
    expect(within(section).getByText(/Llevas 7 de 10\./)).toBeInTheDocument()
    expect(within(section).getByRole("link", { name: "Registrar una huella" })).toHaveAttribute("href", "/nueva-huella")
    expect(within(section).queryByRole("tablist")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("con 9 huellas habla en singular", async () => {
    mockStats({ body: NOT_READY(9) })
    const section = await openSection()
    expect(await within(section).findByRole("heading", { name: "Te falta 1 huella para ver tus estadísticas" })).toBeInTheDocument()
  })
})

describe("HU13 · Reconocer los elementos con la IA", () => {
  it("si faltan elementos, avisa que los está reconociendo y luego los muestra", async () => {
    let recognized = false
    const pending = { ...SAMPLE_SENSATION_STATS, pending: 5, top_elements: [] }
    const fetchMock = mockStats(
      () => ({ body: recognized ? SAMPLE_SENSATION_STATS : pending }),
      () => {
        recognized = true
        return { body: { status: "ok", extracted: 5, pending: 0 } }
      },
    )
    const section = await openSection()

    expect(await within(section).findByText(/^En los últimos 30 días/)).toBeInTheDocument()
    expect(await within(section).findByRole("list", { name: "Los 5 elementos que más registras" })).toBeInTheDocument()
    expect(within(section).queryByRole("status")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("muestra «reconociendo» mientras la IA trabaja", async () => {
    let finish: (reply: MockReply) => void = () => {}
    const waiting = new Promise<MockReply>((resolve) => {
      finish = resolve
    })
    mockApi({
      ...BASE,
      "GET traces/stats/": { body: { ...SAMPLE_SENSATION_STATS, pending: 5, top_elements: [] } },
    })
    // La extracción no responde hasta que la prueba lo decide.
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST" && String(input).includes("stats/elements/")) {
        const reply = await waiting
        return new Response(JSON.stringify(reply.body), { status: 200, headers: { "content-type": "application/json" } })
      }
      return original(input, init)
    }) as typeof fetch
    const section = await openSection()

    expect(await within(section).findByRole("status")).toHaveTextContent("Estamos reconociendo los elementos de 5 huellas…")
    finish({ body: { status: "unavailable", extracted: 0, pending: 5 } })
    await waitFor(() => expect(within(section).queryByRole("status")).not.toBeInTheDocument())
  })

  it("si la IA no está disponible lo dice, deja los tipos y permite intentar de nuevo", async () => {
    let attempts = 0
    const fetchMock = mockStats(
      () => ({ body: attempts > 1 ? SAMPLE_SENSATION_STATS : { ...SAMPLE_SENSATION_STATS, pending: 5, top_elements: [] } }),
      () => {
        attempts += 1
        return { body: { status: attempts > 1 ? "ok" : "unavailable", extracted: attempts > 1 ? 5 : 0, pending: attempts > 1 ? 0 : 5 } }
      },
    )
    const section = await openSection()

    expect(await within(section).findByText(/No pudimos reconocer ahora los elementos de 5 huellas/)).toBeInTheDocument()
    expect(within(section).getByText("Aún no reconocemos elementos en tus notas de este periodo.")).toBeInTheDocument()
    expect(within(section).getByRole("list", { name: "Huellas por tipo" })).toBeInTheDocument()

    await userEvent.click(within(section).getByRole("button", { name: "Intentar de nuevo" }))
    expect(await within(section).findByRole("list", { name: "Los 5 elementos que más registras" })).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2)
  })

  it("si no carga, lo dice y permite reintentar", async () => {
    let fail = true
    mockStats(() => (fail ? { status: 500, body: { detail: "Error del servidor" } } : { body: SAMPLE_SENSATION_STATS }))
    const section = await openSection()

    expect(await within(section).findByRole("alert")).toHaveTextContent("No pudimos cargar tus estadísticas")
    fail = false
    await userEvent.click(within(section).getByRole("button", { name: "Intentar de nuevo" }))
    expect(await within(section).findByText(/^En los últimos 30 días/)).toBeInTheDocument()
  })
})
