import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { MemoryGraph, MemorySuggestion, SuggestionsSummary, SuggestResponse } from "@/lib/memories"
import { EMOTION_OPTIONS, SAMPLE_TRACES, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const EMPTY_GRAPH: MemoryGraph = { total: 0, count: 0, nodes: [], edges: [], max_links: 4 }

const SUGGESTION: MemorySuggestion = {
  id: "s-1",
  name: "Mañanas con olor a casa",
  explanation: "Huellas de mañanas tranquilas en las que un aroma te llevó a la casa de tu familia.",
  emotion: "calma",
  trace_count: 3,
  sensory_types: ["aroma", "flavor"],
  status: "suggested",
  suggested_at: "2026-11-05T14:00:00-05:00",
  traces: SAMPLE_TRACES.slice(0, 3),
}

function summary(overrides: Partial<SuggestionsSummary> = {}): SuggestionsSummary {
  return { suggestions: [], trace_count: 12, ungrouped_count: 7, min_traces: 5, can_suggest: true, ...overrides }
}

function suggestReply(overrides: Partial<SuggestResponse> = {}): { body: SuggestResponse } {
  return { body: { ...summary({ suggestions: [SUGGESTION], ungrouped_count: 4 }), reason: "ok", ...overrides } }
}

type Handlers = Parameters<typeof mockApi>[0]

function mockMemories(extra: Handlers = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET memories/": { body: EMPTY_GRAPH },
    "GET memories/suggestions/": { body: summary() },
    "POST memories/suggest/": suggestReply(),
    ...extra,
  })
}

const openMemories = () => renderApp({ path: "/recuerdos", user: SAMPLE_USER, locked: false })
const card = () => screen.findByTestId("memory-suggestion", {}, { timeout: 5000 })
const calls = (fetchMock: ReturnType<typeof mockApi>, key: string) =>
  fetchMock.mock.calls.filter(([input, init]) => `${init?.method ?? "GET"} ${String(input).split("/api/v1/")[1]}` === key)

beforeAll(async () => {
  await import("@/pages/MemoriesPage")
}, 60_000)

// La app le pide a la IA una vez por sesión: cada prueba empieza como una sesión nueva.
beforeEach(() => window.sessionStorage.clear())

describe("HU9 · Escenario 1: con 5 huellas o más, la app sugiere al menos un recuerdo", () => {
  it("al abrir «Recuerdos» pide sugerencias a la IA y muestra el recuerdo propuesto", async () => {
    const fetchMock = mockMemories()
    openMemories()

    const suggestion = await card()
    expect(within(suggestion).getByRole("heading", { name: "Mañanas con olor a casa" })).toBeInTheDocument()
    expect(within(suggestion).getByText("Sugerencia de la IA")).toBeInTheDocument()
    expect(within(suggestion).getByText("3 huellas")).toBeInTheDocument()
    expect(calls(fetchMock, "POST memories/suggest/")).toHaveLength(1)
    expect(screen.getByRole("heading", { name: /Sugerencias de la IA/ })).toHaveTextContent("1")
  })

  it("no vuelve a pedirle a la IA en la misma sesión; queda el botón para buscar más", async () => {
    const fetchMock = mockMemories({ "POST memories/suggest/": suggestReply({ suggestions: [], reason: "none" }) })
    const user = userEvent.setup()
    openMemories()

    expect(await screen.findByText(/La IA no encontró huellas que vayan juntas/)).toBeInTheDocument()
    expect(calls(fetchMock, "POST memories/suggest/")).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Buscar sugerencias" }))
    await waitFor(() => expect(calls(fetchMock, "POST memories/suggest/")).toHaveLength(2))
  })

  it("con sugerencias pendientes las muestra sin llamar a la IA", async () => {
    const fetchMock = mockMemories({ "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) } })
    openMemories()

    await card()
    expect(calls(fetchMock, "POST memories/suggest/")).toHaveLength(0)
    expect(screen.getByRole("button", { name: "Buscar más sugerencias" })).toBeInTheDocument()
  })

  it("con menos de 5 huellas dice cuántas faltan y no llama a la IA", async () => {
    const fetchMock = mockMemories({
      "GET memories/suggestions/": { body: summary({ trace_count: 3, ungrouped_count: 3, can_suggest: false }) },
    })
    openMemories()

    expect(await screen.findByText("Registra 2 huellas más y la IA te propondrá recuerdos a partir de ellas.")).toBeInTheDocument()
    const section = screen.getByRole("region", { name: "Sugerencias de la IA" })
    expect(within(section).getByRole("link", { name: "Registrar una huella" })).toHaveAttribute("href", "/nueva-huella")
    expect(calls(fetchMock, "POST memories/suggest/")).toHaveLength(0)
    expect(screen.queryByRole("button", { name: /Buscar sugerencias/ })).not.toBeInTheDocument()
  })

  it("si la IA no está disponible lo dice y deja reintentar", async () => {
    mockMemories({ "POST memories/suggest/": suggestReply({ suggestions: [], reason: "unavailable" }) })
    openMemories()

    expect(await screen.findByText(/La IA no está disponible en este momento/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buscar sugerencias" })).toBeInTheDocument()
    expect(screen.queryByTestId("memory-suggestion")).not.toBeInTheDocument()
  })

  it("si falla la carga de sugerencias se puede reintentar sin perder el mapa", async () => {
    let attempts = 0
    mockMemories({
      "GET memories/suggestions/": () => (++attempts === 1 ? { status: 500, body: { detail: "Error del servidor." } } : { body: summary({ suggestions: [SUGGESTION] }) }),
    })
    const user = userEvent.setup()
    openMemories()

    expect(await screen.findByText(/No pudimos cargar tus sugerencias/)).toBeInTheDocument()
    expect(await screen.findByText("Aún no tienes recuerdos")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await card()).toBeInTheDocument()
  })
})

describe("HU9 · Escenario 2: ver por qué se agrupó y aceptar, renombrar o separar", () => {
  const pending = () => mockMemories({ "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) } })

  it("muestra por qué se agruparon las huellas y cuáles son", async () => {
    pending()
    openMemories()

    const suggestion = await card()
    expect(within(suggestion).getByText(/Por qué van juntas:/).closest("p")).toHaveTextContent(SUGGESTION.explanation)
    const traces = within(suggestion).getByRole("list", { name: "Huellas de Mañanas con olor a casa" })
    expect(within(traces).getAllByRole("listitem")).toHaveLength(3)
    expect(within(traces).getByText(SAMPLE_TRACES[0].note)).toBeInTheDocument()
    expect(within(suggestion).getByRole("button", { name: "Aceptar recuerdo" })).toBeEnabled()
    expect(within(suggestion).getByRole("button", { name: "Renombrar" })).toBeEnabled()
    expect(within(suggestion).getByRole("button", { name: "Descartar" })).toBeEnabled()
  })

  it("al aceptarla desaparece de las sugerencias y el mapa se vuelve a cargar con ella", async () => {
    let graphCalls = 0
    const fetchMock = mockMemories({
      "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) },
      "GET memories/": () => ({
        body: ++graphCalls === 1 ? EMPTY_GRAPH : { total: 1, count: 1, max_links: 4, edges: [], nodes: [{ ...SUGGESTION, match: true }] },
      }),
      "POST memories/s-1/accept/": { body: { ...SUGGESTION, status: "accepted" } },
    })
    const user = userEvent.setup()
    openMemories()

    await user.click(within(await card()).getByRole("button", { name: "Aceptar recuerdo" }))

    await waitFor(() => expect(screen.queryByTestId("memory-suggestion")).not.toBeInTheDocument())
    expect(calls(fetchMock, "POST memories/s-1/accept/")).toHaveLength(1)
    expect(await screen.findByRole("button", { name: "Mañanas con olor a casa: Calma, 3 huellas" }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText("No tienes sugerencias pendientes.")).toBeInTheDocument()
  })

  it("renombrarla guarda el nombre nuevo", async () => {
    const fetchMock = mockMemories({
      "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) },
      "PATCH memories/s-1/": ({ body }) => ({ body: { ...SUGGESTION, name: (body as { name: string }).name } }),
    })
    const user = userEvent.setup()
    openMemories()

    await user.click(within(await card()).getByRole("button", { name: "Renombrar" }))
    const input = screen.getByRole("textbox", { name: "Nuevo nombre" })
    expect(input).toHaveFocus()
    await user.clear(input)
    await user.type(input, "Desayunos en familia")
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }))

    expect(await screen.findByRole("heading", { name: "Desayunos en familia" })).toBeInTheDocument()
    expect(sentBody(fetchMock, "PATCH memories/s-1/")).toEqual({ name: "Desayunos en familia" })
  })

  it("separar una huella la quita del recuerdo; la última no se puede separar", async () => {
    const remaining = SUGGESTION.traces.slice(1)
    const fetchMock = mockMemories({
      "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) },
      [`DELETE memories/s-1/traces/${SAMPLE_TRACES[0].id}/`]: { body: { ...SUGGESTION, trace_count: 2, traces: remaining } },
    })
    const user = userEvent.setup()
    openMemories()

    const suggestion = await card()
    await user.click(within(suggestion).getAllByRole("button", { name: /^Quitar «/ })[0])

    await waitFor(() => expect(within(suggestion).getAllByRole("listitem")).toHaveLength(2))
    expect(within(suggestion).queryByText(SAMPLE_TRACES[0].note)).not.toBeInTheDocument()
    expect(calls(fetchMock, `DELETE memories/s-1/traces/${SAMPLE_TRACES[0].id}/`)).toHaveLength(1)
  })

  it("con una sola huella, «Quitar» queda desactivado y hay que descartar", async () => {
    mockMemories({
      "GET memories/suggestions/": { body: summary({ suggestions: [{ ...SUGGESTION, trace_count: 1, traces: SUGGESTION.traces.slice(0, 1) }] }) },
    })
    openMemories()

    const suggestion = await card()
    expect(within(suggestion).getByRole("button", { name: /^Quitar «/ })).toBeDisabled()
  })

  it("descartarla la saca de la lista sin tocar el mapa", async () => {
    const fetchMock = mockMemories({
      "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) },
      "POST memories/s-1/discard/": { status: 204 },
    })
    const user = userEvent.setup()
    openMemories()

    await user.click(within(await card()).getByRole("button", { name: "Descartar" }))

    await waitFor(() => expect(screen.queryByTestId("memory-suggestion")).not.toBeInTheDocument())
    expect(calls(fetchMock, "POST memories/s-1/discard/")).toHaveLength(1)
    expect(await screen.findByText("Aún no tienes recuerdos")).toBeInTheDocument()
  })

  it("si una acción falla, la tarjeta lo dice y sigue ahí", async () => {
    mockMemories({
      "GET memories/suggestions/": { body: summary({ suggestions: [SUGGESTION] }) },
      "POST memories/s-1/accept/": { status: 400, body: { detail: "Este recuerdo ya no es una sugerencia." } },
    })
    const user = userEvent.setup()
    openMemories()

    await user.click(within(await card()).getByRole("button", { name: "Aceptar recuerdo" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Este recuerdo ya no es una sugerencia.")
    expect(screen.getByTestId("memory-suggestion")).toBeInTheDocument()
  })
})
