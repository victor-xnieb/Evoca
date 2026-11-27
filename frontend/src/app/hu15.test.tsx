import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { Island, IslandsData } from "@/lib/islands"
import type { MemoryNode } from "@/lib/memories"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody, type MockReply } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const NO_SUGGESTIONS = { body: { suggestions: [], trace_count: 40, ungrouped_count: 0, min_traces: 5, can_suggest: false } }

const island = (id: string, name: string, weight: number | null, extra: Partial<Island> = {}): Island => ({
  id,
  name,
  ai_name: name,
  renamed: false,
  explanation: `Tus recuerdos de ${name.toLowerCase()}.`,
  hidden: false,
  weight,
  trace_count: weight ?? 3,
  memories: [
    { id: `${id}-1`, name: `${name} uno`, emotion: "calma", trace_count: 3 },
    { id: `${id}-2`, name: `${name} dos`, emotion: "alegria", trace_count: 2 },
  ],
  ...extra,
})

const READY: IslandsData = {
  status: "ready",
  memory_count: 40,
  required: 15,
  missing: 0,
  outdated: false,
  calculated_at: "2026-11-26T10:00:00Z",
  islands: [island("i-calma", "Momentos de calma", 50), island("i-amigos", "Amigos y celebraciones", 30), island("i-familia", "La familia", 20)],
  hidden: [],
}

const NODE: MemoryNode = {
  id: "i-calma-1",
  name: "Momentos de calma uno",
  explanation: "",
  emotion: "calma",
  trace_count: 3,
  sensory_types: ["aroma"],
  match: true,
}

type Handler = MockReply | ((request: { body: unknown; query: URLSearchParams }) => MockReply)

function mockIslands(get: Handler, extra: Record<string, Handler> = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET memories/suggestions/": NO_SUGGESTIONS,
    "GET memories/": { body: { total: 1, count: 1, nodes: [NODE], edges: [], max_links: 4, central_count: 0, max_central: 5 } },
    "GET memories/i-calma-1/": { body: { ...NODE, status: "accepted", traces: [] } },
    "GET islands/": get,
    ...extra,
  })
}

const openIslands = () => renderApp({ path: "/recuerdos?vista=islas", user: SAMPLE_USER, locked: false })
const islandsList = () => screen.findByRole("list", { name: "Islas, de la que más pesa a la que menos" }, { timeout: 5000 })
const islandNames = (list: HTMLElement) =>
  within(list)
    .getAllByRole("article")
    .map((card) => card.getAttribute("aria-label"))

beforeAll(async () => {
  await import("@/pages/MemoriesPage")
}, 60_000)

describe("HU15 · Escenario 1: con 15 recuerdos la IA propone de 2 a 6 islas con nombre y peso", () => {
  it("la primera vez las calcula y las muestra de la que más pesa a la que menos", async () => {
    const fetchMock = mockIslands({ body: { ...READY, status: "pending", islands: [], calculated_at: null } }, { "POST islands/calculate/": { body: READY } })
    openIslands()

    const list = await islandsList()

    expect(islandNames(list)).toEqual(["Momentos de calma", "Amigos y celebraciones", "La familia"])
    expect(within(list).getAllByRole("article")[0]).toHaveTextContent("50 % de peso")
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("mientras la IA calcula, lo dice", async () => {
    let finish: (reply: MockReply) => void = () => {}
    const waiting = new Promise<MockReply>((resolve) => {
      finish = resolve
    })
    mockIslands({ body: { ...READY, status: "pending", islands: [], calculated_at: null } })
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST" && String(input).includes("islands/calculate/")) {
        const reply = await waiting
        return new Response(JSON.stringify(reply.body), { status: 200, headers: { "content-type": "application/json" } })
      }
      return original(input, init)
    }) as typeof fetch
    openIslands()

    expect(await screen.findByRole("status", {}, { timeout: 5000 })).toHaveTextContent("La IA está buscando tus islas…")
    finish({ body: READY })
    expect(await islandsList()).toBeInTheDocument()
  })

  it("con menos de 15 recuerdos dice cuántos faltan", async () => {
    mockIslands({ body: { ...READY, status: "too_few", memory_count: 12, missing: 3, islands: [] } })
    openIslands()
    expect(await screen.findByRole("heading", { name: "Te faltan 3 recuerdos para descubrir tus islas" }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText(/Llevas 12 de 15\./)).toBeInTheDocument()
  })

  it("las pestañas cambian entre el mapa y mis islas", async () => {
    mockIslands({ body: READY })
    const user = userEvent.setup()
    renderApp({ path: "/recuerdos", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("tab", { name: "Mis islas" }, { timeout: 5000 }))
    expect(await islandsList()).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Mapa" }))
    expect(await screen.findByRole("button", { name: /^Momentos de calma uno:/ }, { timeout: 5000 })).toBeInTheDocument()
  })
})

describe("HU15 · Escenario 2: al tocar una isla veo sus recuerdos y por qué se agruparon", () => {
  it("se despliega con su explicación y sus recuerdos, que se abren en el mapa", async () => {
    mockIslands({ body: READY })
    const user = userEvent.setup()
    openIslands()
    const card = within(await islandsList()).getAllByRole("article")[0]

    const toggle = within(card).getByRole("button", { name: /Momentos de calma/ })
    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(card).toHaveTextContent("Por qué se agruparon: Tus recuerdos de momentos de calma.")
    const memories = within(card).getByRole("list", { name: "Recuerdos de Momentos de calma" })
    await user.click(within(memories).getByRole("button", { name: /Momentos de calma uno/ }))

    expect(await screen.findByRole("region", { name: "Momentos de calma uno" }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Mapa" })).toHaveAttribute("aria-selected", "true")
  })
})

describe("HU15 · Escenario 3: renombrar u ocultar una isla", () => {
  it("renombrar guarda el nombre nuevo", async () => {
    const renamed = { ...READY, islands: [island("i-calma", "Mi refugio", 50, { ai_name: "Momentos de calma", renamed: true }), ...READY.islands.slice(1)] }
    const fetchMock = mockIslands({ body: READY }, { "PATCH islands/i-calma/": { body: renamed } })
    const user = userEvent.setup()
    openIslands()
    const card = within(await islandsList()).getAllByRole("article")[0]
    await user.click(within(card).getByRole("button", { name: /Momentos de calma/ }))

    await user.click(within(card).getByRole("button", { name: "Renombrar" }))
    const input = within(card).getByLabelText("Nombre de la isla")
    await user.clear(input)
    await user.type(input, "Mi refugio")
    await user.click(within(card).getByRole("button", { name: "Guardar" }))

    await waitFor(() => expect(islandNames(screen.getByRole("list", { name: /Islas, de la que más pesa/ }))[0]).toBe("Mi refugio"))
    expect(sentBody(fetchMock, "PATCH islands/i-calma/")).toEqual({ name: "Mi refugio" })
  })

  it("ocultar la lleva a «Islas ocultas» y se puede volver a mostrar", async () => {
    const hidden = { ...READY, islands: [island("i-amigos", "Amigos y celebraciones", 60), island("i-familia", "La familia", 40)], hidden: [island("i-calma", "Momentos de calma", null, { hidden: true })] }
    const fetchMock = mockIslands({ body: READY }, { "PATCH islands/i-calma/": ({ body }) => ({ body: (body as { hidden: boolean }).hidden ? hidden : READY }) })
    const user = userEvent.setup()
    openIslands()
    const card = within(await islandsList()).getAllByRole("article")[0]
    await user.click(within(card).getByRole("button", { name: /Momentos de calma/ }))

    await user.click(within(card).getByRole("button", { name: "Ocultar isla" }))

    await waitFor(() => expect(islandNames(screen.getByRole("list", { name: /Islas, de la que más pesa/ }))).toEqual(["Amigos y celebraciones", "La familia"]))
    expect(sentBody(fetchMock, "PATCH islands/i-calma/")).toEqual({ hidden: true })
    expect(screen.getByText("Islas ocultas (1)")).toBeInTheDocument()
  })

  it("si los recuerdos cambiaron lo avisa y permite volver a calcular", async () => {
    const fetchMock = mockIslands({ body: { ...READY, outdated: true } }, { "POST islands/calculate/": { body: READY } })
    const user = userEvent.setup()
    openIslands()
    await islandsList()

    expect(screen.getByText("Tus recuerdos cambiaron desde que se calcularon tus islas.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Volver a calcular" }))

    await waitFor(() => expect(screen.queryByText("Tus recuerdos cambiaron desde que se calcularon tus islas.")).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("si la IA falla al recalcular, se siguen viendo las islas de antes", async () => {
    mockIslands({ body: { ...READY, outdated: true } }, { "POST islands/calculate/": { body: { ...READY, status: "unavailable", islands: [] } } })
    const user = userEvent.setup()
    openIslands()
    await islandsList()

    await user.click(screen.getByRole("button", { name: "Volver a calcular" }))

    expect(await screen.findByText("No pudimos calcular tus islas ahora. Inténtalo en un momento.")).toBeInTheDocument()
    expect(islandNames(screen.getByRole("list", { name: /Islas, de la que más pesa/ }))).toHaveLength(3)
  })
})
