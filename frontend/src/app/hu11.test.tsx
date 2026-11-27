import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { MemoryGraph, MemoryNode } from "@/lib/memories"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const NO_SUGGESTIONS = { body: { suggestions: [], trace_count: 20, ungrouped_count: 0, min_traces: 5, can_suggest: false } }

const node = (id: string, name: string, emotion: string, central_at: string | null = null): MemoryNode => ({
  id,
  name,
  explanation: "",
  emotion,
  trace_count: 3,
  sensory_types: ["aroma"],
  match: true,
  central: central_at !== null,
  central_at,
})

/** Un servidor de mentira con estado: marcar, desmarcar y borrar cambian el mapa que responde. */
function server(initial: MemoryNode[]) {
  let nodes = initial.map((item) => ({ ...item }))
  const graph = (): MemoryGraph => ({
    total: nodes.length,
    count: nodes.length,
    nodes,
    edges: [],
    max_links: 4,
    central_count: nodes.filter((item) => item.central).length,
    max_central: 5,
  })
  const handlers: Record<string, unknown> = {
    "GET traces/catalog/": CATALOG,
    "GET memories/suggestions/": NO_SUGGESTIONS,
    "GET memories/": () => ({ body: graph() }),
  }
  for (const item of initial) {
    handlers[`GET memories/${item.id}/`] = () => ({ body: { ...nodes.find((other) => other.id === item.id), status: "accepted", traces: [] } })
    handlers[`POST memories/${item.id}/central/`] = ({ body }: { body: { central: boolean } }) => {
      nodes = nodes.map((other) =>
        other.id === item.id ? { ...other, central: body.central, central_at: body.central ? "2026-11-26T10:00:00Z" : null } : other,
      )
      return { body: { id: item.id, central: body.central, central_count: graph().central_count, max_central: 5 } }
    }
    handlers[`DELETE memories/${item.id}/`] = () => {
      nodes = nodes.filter((other) => other.id !== item.id)
      return { status: 204 }
    }
  }
  return mockApi(handlers as Parameters<typeof mockApi>[0])
}

const FAMILY = node("m-familia", "La familia y sus abrazos", "gratitud", "2026-10-01T10:00:00Z")
const FLAVORS = node("m-sabores", "Sabores de la infancia", "alegria", "2026-10-05T10:00:00Z")
const PARTY = node("m-fiesta", "Fiestas y amigos", "alegria")
const NERVES = node("m-nervios", "Tardes de nervios", "ansiedad")

const openMap = () => renderApp({ path: "/recuerdos", user: SAMPLE_USER, locked: false })
const centralsSection = () => screen.findByRole("region", { name: "Mis recuerdos centrales" }, { timeout: 5000 })
const centralNames = (section: HTMLElement) =>
  within(section).queryAllByRole("listitem").map((item) => item.textContent)

async function openSphere(name: string) {
  const user = userEvent.setup()
  ;(await screen.findByRole("button", { name: new RegExp(`^${name}:`) }, { timeout: 5000 })).focus()
  await user.keyboard("{Enter}")
  return screen.findByRole("region", { name })
}

// El mapa se carga en diferido: se importa antes para medir la pantalla y no la importación.
beforeAll(async () => {
  await import("@/pages/MemoriesPage")
}, 60_000)

describe("HU11 · Escenario 1: marcar o desmarcar un recuerdo como central, hasta 5", () => {
  it("marcar un recuerdo lo guarda y aparece entre los centrales; desmarcarlo lo quita", async () => {
    const fetchMock = server([FAMILY, FLAVORS, PARTY, NERVES])
    const user = userEvent.setup()
    openMap()
    const section = await centralsSection()
    expect(within(section).getByText("2 de 5")).toBeInTheDocument()

    const panel = await openSphere("Fiestas y amigos")
    expect(within(panel).getByText("Los recuerdos centrales son los que más te definen. Llevas 2 de 5.")).toBeInTheDocument()
    await user.click(within(panel).getByRole("button", { name: "Marcar como central" }))

    await waitFor(() => expect(within(section).getByText("3 de 5")).toBeInTheDocument())
    expect(sentBody(fetchMock, "POST memories/m-fiesta/central/")).toEqual({ central: true })
    expect(centralNames(section)).toEqual(["La familia y sus abrazos", "Sabores de la infancia", "Fiestas y amigos"])
    expect(await within(panel).findByRole("button", { name: "Quitar de centrales" })).toBeInTheDocument()

    await user.click(within(panel).getByRole("button", { name: "Quitar de centrales" }))
    await waitFor(() => expect(within(section).getByText("2 de 5")).toBeInTheDocument())
    expect(centralNames(section)).not.toContain("Fiestas y amigos")
  })

  it("con 5 centrales no deja marcar otro y explica por qué", async () => {
    const five = ["a", "b", "c", "d", "e"].map((id, index) => node(`m-${id}`, `Central ${id}`, "calma", `2026-10-0${index + 1}T10:00:00Z`))
    server([...five, PARTY])
    openMap()
    expect(within(await centralsSection()).getByText("5 de 5")).toBeInTheDocument()

    const panel = await openSphere("Fiestas y amigos")

    expect(within(panel).getByRole("button", { name: "Marcar como central" })).toBeDisabled()
    expect(within(panel).getByText("Ya tienes 5 recuerdos centrales. Quita uno para elegir este.")).toBeInTheDocument()
  })

  it("si el servidor no lo guarda, lo dice", async () => {
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET memories/suggestions/": NO_SUGGESTIONS,
      "GET memories/": { body: { total: 1, count: 1, nodes: [PARTY], edges: [], max_links: 4, central_count: 0, max_central: 5 } },
      "GET memories/m-fiesta/": { body: { ...PARTY, status: "accepted", traces: [] } },
      "POST memories/m-fiesta/central/": { status: 400, body: { detail: "Ya tienes 5 recuerdos centrales. Quita uno para elegir este." } },
    })
    const user = userEvent.setup()
    openMap()

    const panel = await openSphere("Fiestas y amigos")
    await user.click(within(panel).getByRole("button", { name: "Marcar como central" }))

    expect(await within(panel).findByRole("alert")).toHaveTextContent("Ya tienes 5 recuerdos centrales")
  })
})

describe("HU11 · Escenario 2: los recuerdos centrales se ven destacados", () => {
  it("en su sección, del primero que se marcó al último, y abren el recuerdo", async () => {
    server([FLAVORS, PARTY, FAMILY])
    const user = userEvent.setup()
    openMap()
    const section = await centralsSection()

    expect(centralNames(section)).toEqual(["La familia y sus abrazos", "Sabores de la infancia"])
    await user.click(within(section).getByRole("button", { name: /Sabores de la infancia/ }))

    expect(await screen.findByRole("region", { name: "Sabores de la infancia" })).toBeInTheDocument()
    expect(within(section).getByRole("button", { name: /Sabores de la infancia/ })).toHaveAttribute("aria-pressed", "true")
  })

  it("en el mapa, con estrella, nombre siempre visible y dicho al lector de pantalla", async () => {
    server([FAMILY, PARTY])
    openMap()

    const central = await screen.findByRole("button", { name: /^La familia y sus abrazos: .*, recuerdo central$/ }, { timeout: 5000 })
    const other = screen.getByRole("button", { name: /^Fiestas y amigos:/ })
    expect(central.querySelector("[data-central-ring]")).not.toBeNull()
    expect(other.querySelector("[data-central-ring]")).toBeNull()
    expect(other.getAttribute("aria-label")).not.toMatch(/central/)
  })

  it("sin centrales, la sección explica cómo marcarlos", async () => {
    server([PARTY, NERVES])
    openMap()
    const section = await centralsSection()
    expect(within(section).getByText("0 de 5")).toBeInTheDocument()
    expect(within(section).getByText(/toca «Marcar como central»/)).toBeInTheDocument()
  })
})

describe("HU11 · Escenario 3: al borrar un recuerdo central se libera su lugar", () => {
  it("pide confirmación, lo borra, deja de aparecer y libera su lugar", async () => {
    const fetchMock = server([FAMILY, FLAVORS, PARTY])
    const user = userEvent.setup()
    openMap()
    const section = await centralsSection()
    await user.click(within(section).getByRole("button", { name: /La familia y sus abrazos/ }))
    const panel = await screen.findByRole("region", { name: "La familia y sus abrazos" })

    await user.click(within(panel).getByRole("button", { name: "Borrar recuerdo" }))
    const dialog = await screen.findByRole("dialog", { name: "¿Borrar «La familia y sus abrazos»?" })
    expect(dialog).toHaveTextContent("de tus recuerdos centrales, y se libera su lugar")
    expect(dialog).toHaveTextContent("Sus huellas no se borran")
    await user.click(within(dialog).getByRole("button", { name: "Borrar recuerdo" }))

    await waitFor(() => expect(within(section).getByText("1 de 5")).toBeInTheDocument())
    expect(centralNames(section)).toEqual(["Sabores de la infancia"])
    expect(screen.queryByRole("region", { name: "La familia y sus abrazos" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^La familia y sus abrazos:/ })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input, init]) => init?.method === "DELETE" && String(input).endsWith("memories/m-familia/"))).toBe(true)
  })

  it("si se cancela, no borra nada", async () => {
    const fetchMock = server([FAMILY])
    const user = userEvent.setup()
    openMap()
    await user.click(within(await centralsSection()).getByRole("button", { name: /La familia y sus abrazos/ }))
    const panel = await screen.findByRole("region", { name: "La familia y sus abrazos" })

    await user.click(within(panel).getByRole("button", { name: "Borrar recuerdo" }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" }))

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false)
    expect(screen.getByRole("region", { name: "La familia y sus abrazos" })).toBeInTheDocument()
  })
})
