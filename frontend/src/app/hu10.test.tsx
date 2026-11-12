import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import { sphereDiameter, type MemoryDetail, type MemoryEdge, type MemoryGraph, type MemoryNode } from "@/lib/memories"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }

const node = (id: string, name: string, emotion: string, trace_count: number, sensory_types: string[]): MemoryNode => ({
  id,
  name,
  explanation: "",
  emotion,
  trace_count,
  sensory_types,
  match: true,
})

const CALM = { ...node("m-calma", "Días de calma", "calma", 6, ["aroma", "color"]), explanation: "Momentos tranquilos con lluvia." }
const FAMILY = node("m-familia", "La familia y sus abrazos", "gratitud", 3, ["aroma", "song"])
const PARTY = node("m-fiesta", "Fiestas y amigos", "alegria", 1, ["song"])
const NERVES = node("m-nervios", "Tardes de nervios", "ansiedad", 4, ["place"])

const CALM_FAMILY: MemoryEdge = { source: "m-calma", target: "m-familia", score: 0.72, reason: "Comparten aromas y un tono luminoso" }
const FAMILY_PARTY: MemoryEdge = { source: "m-familia", target: "m-fiesta", score: 0.45, reason: "Comparten canciones y un tono luminoso" }

function graph(sensoryType: string | null): MemoryGraph {
  const nodes = [CALM, FAMILY, PARTY, NERVES].map((item) => ({
    ...item,
    match: !sensoryType || item.sensory_types.includes(sensoryType),
  }))
  // Como el servidor: con filtro, solo hay conexiones entre los que coinciden.
  const edges = sensoryType === "song" ? [FAMILY_PARTY] : sensoryType ? [] : [CALM_FAMILY, FAMILY_PARTY]
  return { total: 4, count: nodes.filter((item) => item.match).length, nodes, edges, max_links: 4 }
}

function trace(id: string, note: string): Trace {
  const when = "2026-11-01T10:00:00-05:00"
  return { id, sensory_type: "aroma", note, emotion: "calma", mood_intensity: 4, tags: [], happened_at: when, created_at: when, updated_at: when }
}

const CALM_DETAIL: MemoryDetail = {
  ...CALM,
  status: "accepted",
  traces: [trace("t1", "Olor a lluvia sobre el pasto."), trace("t2", "La cobija suave del sofá.")],
}

function mockGraph(extra: Record<string, unknown> = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET memories/": ({ query }) => ({ body: graph(query.get("sensory_type")) }),
    "GET memories/m-calma/": { body: CALM_DETAIL },
    "GET memories/m-familia/": { body: { ...FAMILY, status: "accepted", traces: [trace("t3", "El perfume de mamá.")] } },
    ...extra,
  } as Parameters<typeof mockApi>[0])
}

const sphere = (name: RegExp | string) => screen.findByRole("button", { name }, { timeout: 5000 })
const openMap = () => renderApp({ path: "/recuerdos", user: SAMPLE_USER, locked: false })
const edges = () => screen.getAllByTestId("memory-edge")
const nodeOf = (button: HTMLElement) => button.closest<HTMLElement>("[data-node]")!

/** Punto medio de una conexión en la pantalla (el mapa la detecta por geometría, no por elemento). */
function edgeMidpoint(key: string) {
  const line = screen.getByTestId("memory-graph").querySelector(`[data-edge="${key}"]`)!
  const layer = screen.getByTestId("memory-graph-layer")
  const [, x, y, k] = /translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([\d.e-]+)\)/.exec(layer.style.transform)!.map(Number)
  const at = (name: string) => Number(line.getAttribute(name))
  return { clientX: ((at("x1") + at("x2")) / 2) * k + x, clientY: ((at("y1") + at("y2")) / 2) * k + y }
}

// La página se carga en diferido: se importa antes para medir la pantalla y no la importación.
beforeAll(async () => {
  await import("@/pages/MemoriesPage")
}, 60_000)

describe("HU10 · Escenario 1: esferas sin orden cronológico, unidas por afinidad", () => {
  it("cada esfera tiene el color de su emoción, su nombre y cuántas huellas guarda", async () => {
    mockGraph()
    openMap()

    const calm = await sphere("Días de calma: Calma, 6 huellas")
    expect(calm).toHaveAttribute("data-emotion", "calma")
    expect(calm.getAttribute("style")).toContain("--sphere-color: var(--emotion-calma)")
    expect(screen.getByRole("button", { name: "Fiestas y amigos: Alegría, 1 huella" })).toHaveAttribute("data-emotion", "alegria")
    expect(screen.getByRole("heading", { name: "4 recuerdos · 2 conexiones" })).toBeInTheDocument()
  })

  it("el tamaño depende de la cantidad de huellas", async () => {
    mockGraph()
    openMap()

    const orbSize = (button: HTMLElement) => Number.parseFloat((button.firstElementChild as HTMLElement).style.width)
    const calm = await sphere(/^Días de calma/)
    const party = screen.getByRole("button", { name: /^Fiestas y amigos/ })
    expect(orbSize(calm)).toBe(sphereDiameter(6))
    expect(orbSize(party)).toBe(sphereDiameter(1))
    expect(orbSize(calm)).toBeGreaterThan(orbSize(party))
  })

  it("dibuja una línea por conexión, más marcada cuanto más afín, y deja solo al que no tiene", async () => {
    mockGraph()
    openMap()

    await sphere(/^Días de calma/)
    const lines = edges()
    expect(lines).toHaveLength(2)
    const visible = (index: number) => lines[index]
    const strong = Number(visible(0).getAttribute("stroke-width"))
    const weak = Number(visible(1).getAttribute("stroke-width"))
    expect(lines[0]).toHaveAttribute("data-score", "0.72")
    expect(strong).toBeGreaterThan(weak)
    expect(Number(visible(0).getAttribute("stroke-opacity"))).toBeGreaterThan(Number(visible(1).getAttribute("stroke-opacity")))
  })

  it("el mapa no muestra fechas", async () => {
    mockGraph()
    openMap()

    await sphere(/^Días de calma/)
    expect(screen.getByTestId("memory-graph").querySelector("time")).toBeNull()
  })
})

describe("HU10 · Escenario 2: tocar una esfera, una línea o filtrar", () => {
  it("al tocar una esfera se resaltan sus conexiones y se ven sus huellas", async () => {
    mockGraph()
    const user = userEvent.setup()
    openMap()

    await user.click(await sphere(/^Días de calma/))

    const panel = await screen.findByRole("region", { name: "Días de calma" })
    expect(within(panel).getByText("Momentos tranquilos con lluvia.")).toBeInTheDocument()
    expect(await within(panel).findByText("Olor a lluvia sobre el pasto.")).toBeInTheDocument()
    expect(within(panel).getByText(/Comparten aromas y un tono luminoso · afinidad 72/)).toBeInTheDocument()
    // Su conexión se resalta; la que no lo toca se atenúa, igual que las esferas que no son vecinas.
    expect(edges()[0]).toHaveAttribute("data-state", "strong")
    expect(edges()[1]).toHaveAttribute("data-state", "faint")
    expect(nodeOf(screen.getByRole("button", { name: /^Tardes de nervios/ })).style.opacity).toBe("0.5")
    expect(nodeOf(screen.getByRole("button", { name: "La familia y sus abrazos: Gratitud, 3 huellas" })).style.opacity).toBe("1")
  })

  it("desde el panel se salta a un recuerdo conectado", async () => {
    mockGraph()
    const user = userEvent.setup()
    openMap()

    await user.click(await sphere(/^Días de calma/))
    const panel = await screen.findByRole("region", { name: "Días de calma" })
    await user.click(within(panel).getByRole("button", { name: /^La familia y sus abrazos/ }))

    expect(await screen.findByRole("region", { name: "La familia y sus abrazos" })).toBeInTheDocument()
    expect(await screen.findByText("El perfume de mamá.")).toBeInTheDocument()
  })

  it("con el teclado, Enter sobre una esfera también la elige", async () => {
    mockGraph()
    const user = userEvent.setup()
    openMap()

    ;(await sphere(/^Días de calma/)).focus()
    await user.keyboard("{Enter}")

    expect(await screen.findByRole("region", { name: "Días de calma" })).toBeInTheDocument()
  })

  it("una huella del recuerdo abre su detalle", async () => {
    mockGraph({ "GET traces/t1/": { body: CALM_DETAIL.traces[0] } })
    const user = userEvent.setup()
    const router = openMap()

    await user.click(await sphere(/^Días de calma/))
    await user.click(await screen.findByText("Olor a lluvia sobre el pasto."))

    await waitFor(() => expect(router.state.location.pathname).toBe("/mis-huellas/t1"))
  })

  it("al tocar una línea se ve el motivo de la conexión", async () => {
    mockGraph()
    openMap()

    await sphere(/^Días de calma/)
    const point = edgeMidpoint("m-calma|m-familia")
    fireEvent.pointerDown(screen.getByTestId("memory-graph"), { pointerId: 5, button: 0, pointerType: "touch", ...point })
    fireEvent.pointerUp(window, { pointerId: 5, pointerType: "touch", ...point })

    const reason = await screen.findByTestId("edge-reason")
    expect(reason).toHaveTextContent("Días de calma · La familia y sus abrazos")
    expect(reason).toHaveTextContent("Comparten aromas y un tono luminoso · afinidad 72 %")
  })

  it("al pasar el mouse sobre una línea también se ve su motivo, y se va al salir", async () => {
    mockGraph()
    openMap()

    await sphere(/^Días de calma/)
    const graphArea = screen.getByTestId("memory-graph")
    fireEvent.pointerMove(graphArea, { pointerId: 1, pointerType: "mouse", ...edgeMidpoint("m-familia|m-fiesta") })

    expect(await screen.findByTestId("edge-reason")).toHaveTextContent("Comparten canciones y un tono luminoso")
    fireEvent.pointerLeave(graphArea, { pointerId: 1, pointerType: "mouse" })
    await waitFor(() => expect(screen.queryByTestId("edge-reason")).not.toBeInTheDocument())
  })

  it("el filtro atenúa lo que no coincide y deja solo las conexiones entre los que coinciden", async () => {
    const fetchMock = mockGraph()
    const user = userEvent.setup()
    openMap()

    await sphere(/^Días de calma/)
    await user.click(screen.getByRole("button", { name: "Filtrar por sensación o emoción" }))
    await user.click(within(screen.getByRole("group", { name: "Sensación" })).getByRole("button", { name: "Canción" }))

    expect(await screen.findByRole("heading", { name: "2 de 4 recuerdos coinciden · 1 conexión" })).toBeInTheDocument()
    expect(nodeOf(screen.getByRole("button", { name: /^Días de calma/ }))).toHaveAttribute("data-match", "false")
    expect(nodeOf(screen.getByRole("button", { name: /^Fiestas y amigos/ }))).toHaveAttribute("data-match", "true")
    expect(nodeOf(screen.getByRole("button", { name: /^Días de calma/ })).style.opacity).toBe("0.22")
    expect(edges()).toHaveLength(1)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("memories/?sensory_type=song"))).toBe(true)
  })

  it("si ningún recuerdo coincide, lo dice y deja quitar los filtros", async () => {
    mockGraph()
    const user = userEvent.setup()
    openMap()

    await sphere(/^Días de calma/)
    await user.click(screen.getByRole("button", { name: "Filtrar por sensación o emoción" }))
    await user.click(within(screen.getByRole("group", { name: "Sensación" })).getByRole("button", { name: "Textura" }))

    expect(await screen.findByText("Ningún recuerdo coincide.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }))
    expect(await screen.findByRole("heading", { name: "4 recuerdos · 2 conexiones" })).toBeInTheDocument()
  })
})

describe("HU10 · mover, acercar y alejar el mapa", () => {
  it("los botones acercan, alejan y vuelven a centrar el mapa", async () => {
    mockGraph()
    const user = userEvent.setup()
    openMap()

    await sphere(/^Días de calma/)
    const layer = screen.getByTestId("memory-graph-layer")
    const scale = () => Number(/scale\(([\d.]+)\)/.exec(layer.style.transform)?.[1])
    const initial = scale()

    await user.click(screen.getByRole("button", { name: "Acercar" }))
    expect(scale()).toBeGreaterThan(initial)
    await user.click(screen.getByRole("button", { name: "Alejar" }))
    await user.click(screen.getByRole("button", { name: "Alejar" }))
    expect(scale()).toBeLessThan(initial)
    await user.click(screen.getByRole("button", { name: "Centrar el mapa" }))
    expect(scale()).toBeCloseTo(initial)
  })

  it("arrastrar una esfera la mueve sin elegirla", async () => {
    mockGraph()
    openMap()

    const calm = await sphere(/^Días de calma/)
    const before = nodeOf(calm).style.transform
    fireEvent.pointerDown(calm, { pointerId: 7, clientX: 100, clientY: 100, button: 0, pointerType: "touch" })
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 160, clientY: 140, pointerType: "touch" })
    fireEvent.pointerUp(window, { pointerId: 7, clientX: 160, clientY: 140, pointerType: "touch" })

    await waitFor(() => expect(nodeOf(screen.getByRole("button", { name: /^Días de calma/ })).style.transform).not.toBe(before))
    expect(screen.queryByRole("region", { name: "Días de calma" })).not.toBeInTheDocument()
  })

  it("arrastrar el fondo desplaza el mapa", async () => {
    mockGraph()
    openMap()

    await sphere(/^Días de calma/)
    const graphArea = screen.getByTestId("memory-graph")
    const layer = screen.getByTestId("memory-graph-layer")
    const before = layer.style.transform
    fireEvent.pointerDown(graphArea, { pointerId: 3, clientX: 50, clientY: 50, button: 0, pointerType: "touch" })
    fireEvent.pointerMove(window, { pointerId: 3, clientX: 90, clientY: 20, pointerType: "touch" })
    fireEvent.pointerUp(window, { pointerId: 3, clientX: 90, clientY: 20, pointerType: "touch" })

    expect(layer.style.transform).not.toBe(before)
  })
})

describe("HU10 · Escenario 3 y estados de la pantalla", () => {
  it("muestra 200 recuerdos", async () => {
    const nodes = Array.from({ length: 200 }, (_, index) => node(`m-${index}`, `Recuerdo ${index + 1}`, "alegria", (index % 9) + 1, ["aroma"]))
    const links = Array.from({ length: 150 }, (_, index) => ({
      source: `m-${index}`,
      target: `m-${(index + 1) % 200}`,
      score: 0.5,
      reason: "Comparten aromas y alegría",
    }))
    mockApi({ "GET traces/catalog/": CATALOG, "GET memories/": { body: { total: 200, count: 200, nodes, edges: links, max_links: 4 } } })
    openMap()

    await sphere(/^Recuerdo 1:/)
    expect(screen.getAllByTestId("memory-sphere")).toHaveLength(200)
    expect(edges()).toHaveLength(150)
    expect(screen.getByRole("heading", { name: "200 recuerdos · 150 conexiones" })).toBeInTheDocument()
  })

  it("sin recuerdos, invita a registrar una huella", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET memories/": { body: { total: 0, count: 0, nodes: [], edges: [], max_links: 4 } } })
    openMap()

    expect(await screen.findByText("Aún no tienes recuerdos", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar una huella" })).toHaveAttribute("href", "/nueva-huella")
    expect(screen.queryByRole("button", { name: "Filtrar por sensación o emoción" })).not.toBeInTheDocument()
  })

  it("si falla la carga, se puede reintentar", async () => {
    let calls = 0
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET memories/": () => (++calls === 1 ? { status: 500, body: { detail: "Error del servidor." } } : { body: graph(null) }),
    })
    const user = userEvent.setup()
    openMap()

    expect(await screen.findByText("No pudimos cargar tus recuerdos", {}, { timeout: 5000 })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await sphere(/^Días de calma/)).toBeInTheDocument()
  })

  it("«Recuerdos» está en la navegación principal", async () => {
    mockGraph()
    openMap()

    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    expect(within(nav).getByRole("link", { name: "Recuerdos" })).toHaveAttribute("aria-current", "page")
  })
})
