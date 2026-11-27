import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { DiaryPage, EvokedMemory, Evocation, Notebook } from "@/lib/diary"
import type { MemoryDetail } from "@/lib/memories"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const SUPPORT = {
  body: {
    version: "draft-v1",
    draft: true,
    help_title: "Puedes hablar con alguien ahora",
    help_message: "Lo que sientes importa.",
    help_lines: [],
    risk_terms: ["suicidio"],
    orientation_title: "Aquí hay apoyo",
    orientation_message: "…",
  },
}

const now = "2026-11-27T10:00:00Z"
const TEXT = "Hoy la casa olía a café desde temprano. En la radio sonó una salsa vieja."
const DIARY: Notebook = { id: "n-1", title: "Mi diario", cover: "terracota", paper: "lined", page_count: 1, created_at: now, updated_at: now }

const page = (evocation?: Evocation): DiaryPage => ({
  id: "p-1",
  notebook: "n-1",
  day: "2026-11-26",
  paper: "",
  font: "caveat",
  ink: "sepia",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: TEXT }] }] },
  text: TEXT,
  day_emotion: null,
  created_at: now,
  updated_at: now,
  evocation,
})

const HOME: EvokedMemory = {
  index: 0,
  name: "Mañanas en casa",
  explanation: "Parece que el café y la casa comparten la calma.",
  status: "suggested",
  memory_id: null,
  traces: [
    { index: 0, sensory_type: "aroma", note: "Olía a café desde temprano.", emotion: "calma", intensity: 4, quote: "olía a café" },
    { index: 1, sensory_type: "place", note: "La casa en la mañana.", emotion: "calma", intensity: 3, quote: "la casa" },
  ],
}
const SALSA: EvokedMemory = {
  index: 1,
  name: "Música con mi hermana",
  explanation: "Parece que la salsa te une a tu hermana.",
  status: "suggested",
  memory_id: null,
  traces: [{ index: 2, sensory_type: "song", note: "Sonó una salsa vieja.", emotion: "alegria", intensity: 5, quote: "una salsa vieja" }],
}

const EVOKED: Evocation = {
  memories: [HOME, SALSA],
  highlights: [
    { quote: "olía a café", emotion: "calma", memory_id: null },
    { quote: "la casa", emotion: "calma", memory_id: null },
    { quote: "una salsa vieja", emotion: "alegria", memory_id: null },
  ],
}
const ACCEPTED: Evocation = {
  memories: [{ ...HOME, name: "Mi casa", status: "accepted", memory_id: "m-1", traces: [HOME.traces[0]] }, SALSA],
  highlights: [
    { quote: "olía a café", emotion: "calma", memory_id: "m-1" },
    { quote: "una salsa vieja", emotion: "alegria", memory_id: null },
  ],
}

function mockDiary(extra: Record<string, unknown> = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET support/content/": SUPPORT,
    "GET diary/notebooks/n-1/": { body: DIARY },
    "GET diary/notebooks/n-1/pages/": { body: [page()] },
    ...extra,
  } as Parameters<typeof mockApi>[0])
}

const openNotebook = () => renderApp({ path: "/cuadernillo/n-1", user: SAMPLE_USER, locked: false })
const editor = () => screen.findByRole("textbox", { name: /^Página del/ }, { timeout: 8000 })
const panel = () => screen.findByRole("region", { name: "Recuerdos evocados de esta página" }, { timeout: 5000 })
const lit = () => [...document.querySelectorAll<HTMLElement>(".diary-evoked")].map((item) => item.textContent)

function emptyRects() {
  return Object.assign([], { item: () => null }) as unknown as DOMRectList
}

beforeAll(async () => {
  Range.prototype.getClientRects = emptyRects
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)
  if (!document.elementFromPoint) document.elementFromPoint = () => null
  const text = Text.prototype as unknown as { getClientRects?: () => DOMRectList }
  if (!text.getClientRects) text.getClientRects = emptyRects
  await import("@/pages/diary/NotebookPage")
  await import("@/pages/MemoriesPage")
}, 60_000)

describe("HU18 · Escenario 1: evocar propone huellas y recuerdos desde la página", () => {
  it("«Evocar» ilumina las palabras y muestra los recuerdos sugeridos", async () => {
    mockDiary({ "POST diary/pages/p-1/evoke/": { body: { status: "ok", page: page(EVOKED) } } })
    const user = userEvent.setup()
    openNotebook()
    await editor()

    await user.click(screen.getByRole("button", { name: "Evocar" }))

    const region = await panel()
    const suggestions = within(region).getAllByRole("listitem").filter((item) => item.parentElement?.parentElement === region)
    expect(suggestions).toHaveLength(2)
    expect(within(suggestions[0]).getByRole("heading", { name: "Mañanas en casa" })).toBeInTheDocument()
    expect(suggestions[0]).toHaveTextContent("Parece que el café y la casa comparten la calma.")
    expect(suggestions[0]).toHaveTextContent("Recuerdo sugerido")
    expect(within(suggestions[0]).getByRole("list", { name: "Huellas de Mañanas en casa" })).toHaveTextContent("Olía a café desde temprano.")
    await waitFor(() => expect(lit()).toEqual(["la casa", "olía a café", "una salsa vieja"]))
  })

  it.each([
    ["too_short", "Escribe un poco más"],
    ["risk", "Esta página no se envía a la IA"],
    ["unavailable", "No pudimos evocar recuerdos ahora"],
  ] as const)("con estado «%s» lo dice y la página sigue igual", async (status, message) => {
    mockDiary({ "POST diary/pages/p-1/evoke/": { body: { status, page: page() } } })
    const user = userEvent.setup()
    openNotebook()
    await editor()
    await user.click(screen.getByRole("button", { name: "Evocar" }))
    expect(within(await panel()).getByRole("status")).toHaveTextContent(message)
    expect(await editor()).toHaveTextContent(TEXT)
    expect(lit()).toEqual([])
  })
})

describe("HU18 · Escenario 2: acepto, ajusto o descarto lo sugerido", () => {
  it("acepta con otro nombre y sin una huella; la palabra pasa a llevar al recuerdo", async () => {
    const fetchMock = mockDiary({
      "GET diary/notebooks/n-1/pages/": { body: [page(EVOKED)] },
      "POST diary/pages/p-1/evocation/0/accept/": { body: { memory_id: "m-1", page: page(ACCEPTED) } },
    })
    const user = userEvent.setup()
    openNotebook()
    const first = (await screen.findByRole("heading", { name: "Mañanas en casa" }, { timeout: 8000 })).closest("li")!

    await user.click(within(first).getByRole("button", { name: "Renombrar" }))
    const name = within(first).getByLabelText("Nombre del recuerdo")
    await user.clear(name)
    await user.type(name, "Mi casa")
    await user.click(within(first).getByRole("button", { name: "Quitar: La casa en la mañana." }))
    await user.click(within(first).getByRole("button", { name: "Aceptar" }))

    expect(sentBody(fetchMock, "POST diary/pages/p-1/evocation/0/accept/")).toEqual({ name: "Mi casa", traces: [0] })
    expect(await screen.findByRole("link", { name: "Ver en el mapa" })).toHaveAttribute("href", "/recuerdos?recuerdo=m-1")
    expect(screen.getByText("Recuerdo aceptado")).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector(".diary-evoked-link")).toHaveAttribute("data-memory", "m-1"))
  })

  it("sin huellas no se puede aceptar", async () => {
    mockDiary({ "GET diary/notebooks/n-1/pages/": { body: [page(EVOKED)] } })
    const user = userEvent.setup()
    openNotebook()
    const second = (await screen.findByRole("heading", { name: "Música con mi hermana" }, { timeout: 8000 })).closest("li")!

    await user.click(within(second).getByRole("button", { name: "Quitar: Sonó una salsa vieja." }))

    expect(within(second).getByRole("button", { name: "Aceptar" })).toBeDisabled()
    expect(second).toHaveTextContent("Deja al menos una huella para aceptarlo.")
  })

  it("descartar quita la sugerencia sin guardar nada", async () => {
    const discarded: Evocation = { memories: [HOME, { ...SALSA, status: "discarded" }], highlights: EVOKED.highlights.slice(0, 2) }
    const fetchMock = mockDiary({
      "GET diary/notebooks/n-1/pages/": { body: [page(EVOKED)] },
      "POST diary/pages/p-1/evocation/1/discard/": { body: { page: page(discarded) } },
    })
    const user = userEvent.setup()
    openNotebook()
    const second = (await screen.findByRole("heading", { name: "Música con mi hermana" }, { timeout: 8000 })).closest("li")!

    await user.click(within(second).getByRole("button", { name: "Descartar" }))

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Música con mi hermana" })).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("evocation/1/discard/"))).toBe(true)
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/accept/"))).toBe(false)
    await waitFor(() => expect(lit()).not.toContain("una salsa vieja"))
  })
})

describe("HU18 · Escenario 3: del recuerdo a la página donde nació", () => {
  const DETAIL: MemoryDetail = {
    id: "m-1",
    name: "Mi casa",
    explanation: "Parece que el café y la casa comparten la calma.",
    emotion: "calma",
    trace_count: 1,
    sensory_types: ["aroma"],
    match: true,
    status: "accepted",
    traces: [],
    diary_page: { id: "p-1", notebook: "n-1", day: "2026-11-26" },
  }

  it("el recuerdo abre su panel desde el enlace y lleva a la página", async () => {
    mockDiary({
      "GET memories/suggestions/": { body: { suggestions: [], trace_count: 1, ungrouped_count: 0, min_traces: 5, can_suggest: false } },
      "GET memories/": { body: { total: 1, count: 1, nodes: [DETAIL], edges: [], max_links: 4 } },
      "GET memories/m-1/": { body: DETAIL },
      "GET diary/notebooks/n-1/pages/": { body: [page(ACCEPTED)] },
    })
    const user = userEvent.setup()
    renderApp({ path: "/recuerdos?recuerdo=m-1", user: SAMPLE_USER, locked: false })

    const memory = await screen.findByRole("region", { name: "Mi casa" }, { timeout: 8000 })
    const back = within(memory).getByRole("link", { name: "Abrir la página donde nació" })
    expect(back).toHaveAttribute("href", "/cuadernillo/n-1?hoja=p-1")

    await user.click(back)
    expect(await editor()).toHaveTextContent(TEXT)
  })

  it("un recuerdo que no nació en el Cuadernillo no muestra el enlace", async () => {
    mockDiary({
      "GET memories/suggestions/": { body: { suggestions: [], trace_count: 1, ungrouped_count: 0, min_traces: 5, can_suggest: false } },
      "GET memories/": { body: { total: 1, count: 1, nodes: [DETAIL], edges: [], max_links: 4 } },
      "GET memories/m-1/": { body: { ...DETAIL, diary_page: null } },
    })
    renderApp({ path: "/recuerdos?recuerdo=m-1", user: SAMPLE_USER, locked: false })

    const memory = await screen.findByRole("region", { name: "Mi casa" }, { timeout: 8000 })
    expect(within(memory).queryByRole("link", { name: "Abrir la página donde nació" })).not.toBeInTheDocument()
  })
})
