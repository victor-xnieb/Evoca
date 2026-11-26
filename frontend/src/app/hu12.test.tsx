import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { resetMeaningSearch } from "@/hooks/use-meaning-search"
import { resetSupportContentCache } from "@/hooks/use-support-content"
import type { SearchResponse } from "@/lib/search"
import type { SupportContent } from "@/lib/support"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SAMPLE_TRACES, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }

const SUPPORT: SupportContent = {
  version: 1,
  draft: true,
  orientation_title: "Aquí hay apoyo si lo necesitas",
  orientation_message: "Hablar con alguien puede ayudar.",
  help_title: "Puedes hablar con alguien ahora",
  help_message: "Lo que sientes importa. Llama a una de estas líneas.",
  help_lines: [{ name: "Línea 192, opción 4", phone: "192", description: "Salud mental" }],
  risk_terms: ["suicidio", "matarse", "matarme", "quiero morir"],
  updated_at: "2026-11-06T10:00:00Z",
}
const LIST = { body: { count: SAMPLE_TRACES.length, next: null, previous: null, results: SAMPLE_TRACES } }

function trace(id: string, note: string): Trace {
  const when = "2026-11-01T10:00:00-05:00"
  return { id, sensory_type: "aroma", note, emotion: "calma", mood_intensity: 4, tags: [], happened_at: when, created_at: when, updated_at: when }
}

const WET = trace("t-mojada", "Olor a tierra mojada saliendo de clase.")
const WINDOW = trace("t-ventana", "La lluvia contra la ventana y una canción vieja.")
const WOOL = trace("t-lana", "El saco de lana mojado y luego el chocolate caliente.")

function reply(overrides: Partial<SearchResponse> = {}): { body: SearchResponse } {
  const results = [
    { similarity: 0.79, level: "high" as const, trace: WET },
    { similarity: 0.68, level: "medium" as const, trace: WINDOW },
    { similarity: 0.62, level: "low" as const, trace: WOOL },
  ]
  return { body: { query: "olor a lluvia", risk: false, mode: "meaning", pending: 0, count: results.length, results, ...overrides } }
}

type Handlers = Parameters<typeof mockApi>[0]

function mockTraces(extra: Handlers = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET traces/": LIST,
    "GET support/content/": { body: SUPPORT },
    "POST support/events/": { status: 201, body: {} },
    "POST traces/search/": reply(),
    ...extra,
  })
}

const openMyTraces = () => renderApp({ path: "/mis-huellas", user: SAMPLE_USER, locked: false })
const searchBox = () => screen.findByRole("searchbox", { name: "Buscar por significado" }, { timeout: 5000 })
const searchCalls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.filter(([input, init]) => String(input).includes("traces/search/") && init?.method === "POST")

async function searchFor(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.type(await searchBox(), query)
  await user.click(screen.getByRole("button", { name: "Buscar" }))
}

beforeAll(async () => {
  await import("@/pages/MyTracesPage")
  await import("@/pages/NewTracePage")
}, 60_000)

beforeEach(() => {
  resetMeaningSearch()
  resetSupportContentCache()
  window.localStorage.clear()
})

describe("HU12 · Escenario 1: encontrar huellas por significado", () => {
  it("al buscar «olor a lluvia» muestra huellas relacionadas aunque no usen esas palabras", async () => {
    const fetchMock = mockTraces()
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "olor a lluvia")

    const results = await screen.findByRole("list", { name: "Resultados, de la más a la menos parecida" })
    expect(within(results).getByText(WET.note)).toBeInTheDocument()
    expect(WET.note).not.toMatch(/lluvia/)
    expect(sentBody(fetchMock, "POST traces/search/")).toEqual({ query: "olor a lluvia" })
    // La frase va en el cuerpo, nunca en la URL.
    expect(String(searchCalls(fetchMock)[0][0])).not.toContain("lluvia")
    expect(screen.getByRole("heading", { name: "3 huellas parecidas a «olor a lluvia»" })).toBeInTheDocument()
  })

  it("mientras hay búsqueda, la lista normal y los filtros se ocultan", async () => {
    mockTraces()
    const user = userEvent.setup()
    openMyTraces()

    expect(await screen.findByRole("list", { name: "Lista de huellas" })).toBeInTheDocument()
    await searchFor(user, "olor a lluvia")

    await screen.findByRole("list", { name: "Resultados, de la más a la menos parecida" })
    expect(screen.queryByRole("list", { name: "Lista de huellas" })).not.toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Tipo" })).not.toBeInTheDocument()
  })

  it("con menos de 3 letras no se puede buscar", async () => {
    const fetchMock = mockTraces()
    const user = userEvent.setup()
    openMyTraces()

    await user.type(await searchBox(), "ab")

    expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled()
    await user.keyboard("{Enter}")
    expect(searchCalls(fetchMock)).toHaveLength(0)
  })
})

describe("HU12 · Escenario 2: ordenadas por relevancia y con qué tan parecidas son", () => {
  it("muestra los resultados en el orden de relevancia, cada uno con su nivel de parecido", async () => {
    mockTraces()
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "olor a lluvia")

    const results = await screen.findByRole("list", { name: "Resultados, de la más a la menos parecida" })
    const items = within(results).getAllByRole("listitem")
    expect(items.map((item) => within(item).getByTestId("similarity").textContent)).toEqual(["Muy parecida", "Parecida", "Algo parecida"])
    expect(within(items[0]).getByText(WET.note)).toBeInTheDocument()
    expect(within(items[2]).getByText(WOOL.note)).toBeInTheDocument()
  })

  it("si la IA no está, avisa que buscó por palabras", async () => {
    mockTraces({
      "POST traces/search/": reply({ mode: "words", count: 1, results: [{ similarity: 1, level: "high", trace: WINDOW }] }),
    })
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "lluvia")

    expect(await screen.findByText(/te mostramos las huellas que contienen esas palabras/)).toBeInTheDocument()
    expect(screen.getByTestId("similarity")).toHaveTextContent("Tiene todas las palabras")
  })

  it("si la IA aún prepara huellas, dice cuántas faltan", async () => {
    mockTraces({ "POST traces/search/": reply({ pending: 85 }) })
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "olor a lluvia")

    expect(await screen.findByText(/Todavía estoy preparando 85 huellas/)).toBeInTheDocument()
  })

  it("al abrir un resultado y volver, la búsqueda sigue ahí sin pedirla otra vez", async () => {
    const fetchMock = mockTraces({ "GET traces/t-mojada/": { body: WET } })
    const user = userEvent.setup()
    const router = openMyTraces()

    await searchFor(user, "olor a lluvia")
    await user.click(await screen.findByText(WET.note))
    await waitFor(() => expect(router.state.location.pathname).toBe("/mis-huellas/t-mojada"))
    await router.navigate("/mis-huellas")

    expect(await screen.findByRole("heading", { name: "3 huellas parecidas a «olor a lluvia»" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Buscar por significado" })).toHaveValue("olor a lluvia")
    expect(searchCalls(fetchMock)).toHaveLength(1)
  })

  it("«Quitar búsqueda» vuelve a la lista de huellas", async () => {
    mockTraces()
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "olor a lluvia")
    await screen.findByRole("list", { name: "Resultados, de la más a la menos parecida" })
    await user.click(screen.getByRole("button", { name: "Quitar búsqueda" }))

    expect(await screen.findByRole("list", { name: "Lista de huellas" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Buscar por significado" })).toHaveValue("")
  })
})

describe("HU12 · Escenario 3: sin resultados, lo dice y propone registrar una huella", () => {
  it("dice que no encontró nada y lleva a «Nueva huella» con la frase en la nota", async () => {
    mockTraces({ "POST traces/search/": reply({ query: "astronautas en Marte", count: 0, results: [] }) })
    const user = userEvent.setup()
    const router = openMyTraces()

    await searchFor(user, "astronautas en Marte")

    expect(await screen.findByText("No encontramos huellas parecidas a «astronautas en Marte»")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Registrar una huella" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/nueva-huella"))
    expect(await screen.findByRole("textbox", { name: /nota/i }, { timeout: 5000 })).toHaveValue("astronautas en Marte")
  })

  it("si la búsqueda falla, se puede reintentar", async () => {
    let calls = 0
    mockTraces({
      "POST traces/search/": () => (++calls === 1 ? { status: 500, body: { detail: "Error del servidor." } } : reply()),
    })
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "olor a lluvia")
    expect(await screen.findByText("No pudimos buscar")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByRole("list", { name: "Resultados, de la más a la menos parecida" })).toBeInTheDocument()
  })
})

describe("HU12 con HU6: una búsqueda con palabras de riesgo no se hace y ofrece ayuda", () => {
  it("al escribir «suicidio» se abre de inmediato la pantalla de ayuda, como en la nota", async () => {
    const fetchMock = mockTraces()
    const user = userEvent.setup()
    openMyTraces()

    await user.type(await searchBox(), "suicidio")

    const dialog = await screen.findByRole("dialog", { name: SUPPORT.help_title })
    expect(within(dialog).getByRole("link", { name: /Línea 192/ })).toHaveAttribute("href", "tel:192")
    expect(searchCalls(fetchMock)).toHaveLength(0)
  })

  it("al buscarla no llama al servidor ni a la IA y ofrece las líneas de ayuda", async () => {
    const fetchMock = mockTraces()
    const user = userEvent.setup()
    const router = openMyTraces()

    await user.type(await searchBox(), "pensé en matarme")
    await user.click(within(await screen.findByRole("dialog", { name: SUPPORT.help_title })).getByRole("button", { name: "Volver a la búsqueda" }))
    await user.click(screen.getByRole("button", { name: "Buscar" }))

    expect(await screen.findByRole("heading", { name: "Estamos aquí contigo" })).toBeInTheDocument()
    expect(searchCalls(fetchMock)).toHaveLength(0)
    expect(screen.queryByRole("list", { name: "Resultados, de la más a la menos parecida" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ver líneas de ayuda" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/ayuda"))
  })

  it("si el servidor detecta riesgo en una frase que la app no conocía, muestra lo mismo", async () => {
    mockTraces({ "POST traces/search/": reply({ query: "frase nueva de riesgo", risk: true, count: 0, results: [] }) })
    const user = userEvent.setup()
    openMyTraces()

    await searchFor(user, "frase nueva de riesgo")

    expect(await screen.findByRole("heading", { name: "Estamos aquí contigo" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Volver a mis huellas" }))
    expect(await screen.findByRole("list", { name: "Lista de huellas" })).toBeInTheDocument()
  })
})
