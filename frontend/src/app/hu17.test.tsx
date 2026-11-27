import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { DiaryPage, Notebook } from "@/lib/diary"
import { DRAFT_HELP_LINES, EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody, type MockReply } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const SUPPORT = {
  body: {
    version: "draft-v1",
    draft: true,
    help_title: "Puedes hablar con alguien ahora",
    help_message: "Lo que sientes importa.",
    help_lines: DRAFT_HELP_LINES,
    risk_terms: ["suicidio", "quiero morir"],
    orientation_title: "Aquí hay apoyo",
    orientation_message: "…",
  },
}

const now = "2026-11-27T10:00:00Z"
const DIARY: Notebook = { id: "n-1", title: "Mi diario", cover: "terracota", paper: "lined", page_count: 2, created_at: now, updated_at: now }
const TRIPS: Notebook = { id: "n-2", title: "Viajes", cover: "azul", paper: "dots", page_count: 0, created_at: now, updated_at: now }

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] })
const page = (id: string, day: string, text: string, extra: Partial<DiaryPage> = {}): DiaryPage => ({
  id,
  notebook: "n-1",
  day,
  paper: "",
  font: "caveat",
  ink: "sepia",
  content: { type: "doc", content: [paragraph(text)] },
  text,
  day_emotion: null,
  created_at: now,
  updated_at: now,
  ...extra,
})

const PAGES = [page("p-1", "2026-11-24", "La biblioteca estaba en silencio."), page("p-2", "2026-11-26", "Hoy olía a café.", { day_emotion: "calma" })]

type Handler = MockReply | ((request: { body: unknown; query: URLSearchParams }) => MockReply)

function mockDiary(extra: Record<string, Handler> = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET support/content/": SUPPORT,
    "GET diary/notebooks/": { body: [DIARY, TRIPS] },
    "GET diary/notebooks/n-1/": { body: DIARY },
    "GET diary/notebooks/n-1/pages/": { body: PAGES },
    ...extra,
  })
}

const openShelf = () => renderApp({ path: "/cuadernillo", user: SAMPLE_USER, locked: false })
const openNotebook = (query = "") => renderApp({ path: `/cuadernillo/n-1${query}`, user: SAMPLE_USER, locked: false })
const editor = () => screen.findByRole("textbox", { name: /^Página del/ }, { timeout: 8000 })

// jsdom no mide el texto: el editor (ProseMirror) necesita estas funciones para escribir.
function emptyRects() {
  return Object.assign([], { item: () => null }) as unknown as DOMRectList
}
const noRect = () => new DOMRect(0, 0, 0, 0)

beforeAll(async () => {
  Range.prototype.getClientRects = emptyRects
  Range.prototype.getBoundingClientRect = noRect
  if (!document.elementFromPoint) document.elementFromPoint = () => null
  const text = Text.prototype as unknown as { getClientRects?: () => DOMRectList }
  if (!text.getClientRects) text.getClientRects = emptyRects
  await import("@/pages/diary/NotebookPage")
  await import("@/pages/DiaryPage")
}, 60_000)

describe("HU17 · Escenario 1: crear un cuaderno y escribir en él", () => {
  it("la estantería muestra mis cuadernos con su portada, papel y páginas", async () => {
    mockDiary()
    openShelf()

    const shelf = await screen.findByRole("list", { name: "Mis cuadernos" }, { timeout: 8000 })
    expect(within(shelf).getByRole("button", { name: "Mi diario: cuaderno de papel rayado, 2 páginas" })).toBeInTheDocument()
    expect(within(shelf).getByRole("button", { name: "Viajes: cuaderno de papel de puntos, 0 páginas" })).toBeInTheDocument()
  })

  it("se crea un cuaderno con título, portada y papel, y se abre", async () => {
    const fetchMock = mockDiary({
      "GET diary/notebooks/": { body: [] },
      "POST diary/notebooks/": { status: 201, body: { ...TRIPS, id: "n-1", title: "Sueños", cover: "ciruela", paper: "grid" } },
      "GET diary/notebooks/n-1/": { body: { ...DIARY, title: "Sueños", page_count: 0 } },
      "GET diary/notebooks/n-1/pages/": { body: [] },
    })
    const user = userEvent.setup()
    openShelf()

    await user.click(await screen.findByRole("button", { name: "Crear mi primer cuaderno" }, { timeout: 8000 }))
    const dialog = await screen.findByRole("dialog", { name: "Nuevo cuaderno" })
    await user.type(within(dialog).getByLabelText("Título"), "Sueños")
    await user.click(within(dialog).getByRole("radio", { name: "Ciruela" }))
    await user.click(within(dialog).getByRole("radio", { name: "Cuadriculado" }))
    await user.click(within(dialog).getByRole("button", { name: "Crear cuaderno" }))

    expect(await screen.findByRole("heading", { name: "Sueños" }, { timeout: 8000 })).toBeInTheDocument()
    expect(sentBody(fetchMock, "POST diary/notebooks/")).toEqual({ title: "Sueños", cover: "ciruela", paper: "grid" })
    expect(screen.getByRole("heading", { name: "Este cuaderno está en blanco" })).toBeInTheDocument()
  })

  it("sin título no se crea", async () => {
    const fetchMock = mockDiary({ "GET diary/notebooks/": { body: [] } })
    const user = userEvent.setup()
    openShelf()
    await user.click(await screen.findByRole("button", { name: "Crear mi primer cuaderno" }, { timeout: 8000 }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Crear cuaderno" }))
    expect(await screen.findByText("Ponle un título a tu cuaderno.")).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("una página nueva se crea al tocar «Nueva página»", async () => {
    const fetchMock = mockDiary({ "POST diary/notebooks/n-1/pages/": { status: 201, body: page("p-3", "2026-11-27", "") } })
    const user = userEvent.setup()
    openNotebook()
    await editor()

    await user.click(screen.getByRole("button", { name: "Nueva página" }))

    expect(await screen.findByText("Página 3 de 3")).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input, init]) => init?.method === "POST" && String(input).includes("diary/notebooks/n-1/pages/"))).toBe(true)
  })
})

describe("HU17 · Escenario 2: lo escrito se conserva y la página muestra la emoción del día", () => {
  it("abre la última página con su texto, su letra y la emoción del día en texto", async () => {
    mockDiary()
    openNotebook()

    const box = await editor()
    expect(box).toHaveTextContent("Hoy olía a café.")
    expect(screen.getByText("Emoción del día: Calma")).toBeInTheDocument()
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument()
  })

  it("una página de un día sin huellas lo dice", async () => {
    mockDiary()
    const user = userEvent.setup()
    openNotebook()
    await editor()

    await user.click(screen.getByRole("button", { name: "Anterior" }))

    await waitFor(() => expect(screen.getByText("Página 1 de 2")).toBeInTheDocument())
    expect(await screen.findByText("Día sin huellas")).toBeInTheDocument()
    expect((await editor())).toHaveTextContent("La biblioteca estaba en silencio.")
  })

  it("cambiar la letra, la tinta o el papel se guarda", async () => {
    const fetchMock = mockDiary({
      "PATCH diary/pages/p-2/": ({ body }) => ({ body: { ...PAGES[1], ...(body as object) } }),
    })
    const user = userEvent.setup()
    openNotebook()
    await editor()

    await user.selectOptions(screen.getByLabelText("Letra"), "kalam")
    await waitFor(() => expect(sentBody(fetchMock, "PATCH diary/pages/p-2/")).toEqual({ font: "kalam" }))
    await user.click(screen.getByRole("radio", { name: "Azul" }))
    await user.selectOptions(screen.getByLabelText("Papel"), "grid")

    await waitFor(() => {
      const bodies = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH").map(([, init]) => JSON.parse(String(init?.body)))
      expect(bodies).toEqual([{ font: "kalam" }, { ink: "azul" }, { paper: "grid" }])
    })
    expect(screen.getByText("Guardado")).toBeInTheDocument()
  })

  it("lo que se escribe se guarda solo", async () => {
    const fetchMock = mockDiary({
      "PATCH diary/pages/p-2/": ({ body }) => ({ body: { ...PAGES[1], content: (body as { content: unknown }).content } }),
    })
    const user = userEvent.setup()
    openNotebook()
    const box = await editor()

    await user.click(box)
    await user.keyboard(" Y llovió.")

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true), { timeout: 4000 })
    const body = sentBody(fetchMock, "PATCH diary/pages/p-2/") as { content: { content: Array<{ content: Array<{ text: string }> }> } }
    expect(body.content.content.map((block) => block.content.map((node) => node.text).join("")).join(" ")).toContain("Y llovió.")
  })
})

describe("HU17 · Escenario 3: una palabra de riesgo abre la ayuda de inmediato", () => {
  it("al escribirla se muestra la pantalla con líneas de ayuda", async () => {
    const fetchMock = mockDiary({ "PATCH diary/pages/p-2/": { body: PAGES[1] } })
    const user = userEvent.setup()
    openNotebook()
    const box = await editor()
    // Las palabras de riesgo llegan con el contenido de apoyo: se espera a tenerlo.
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("support/content/"))).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))

    await user.click(box)
    // jsdom deja el cursor al inicio: la palabra va seguida de un espacio para quedar completa.
    await user.keyboard("suicidio ")

    const help = await screen.findByRole("dialog", {}, { timeout: 4000 })
    expect(help).toHaveTextContent("Puedes hablar con alguien ahora")
    expect(within(help).getAllByRole("link").length).toBeGreaterThan(0)
  })

  it("lo que ya estaba escrito no la vuelve a abrir al entrar", async () => {
    mockDiary({ "GET diary/notebooks/n-1/pages/": { body: [page("p-2", "2026-11-26", "Pensé en el suicidio.")] } })
    openNotebook()
    await editor()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
