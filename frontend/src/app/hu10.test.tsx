import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import { arrangeSpheres, sphereDiameter, type MemoryDetail, type MemorySphere } from "@/lib/memories"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }

const CALM: MemorySphere = {
  id: "11111111-0000-4000-8000-000000000001",
  name: "Días de calma",
  explanation: "Momentos tranquilos con lluvia y colores suaves.",
  emotion: "calma",
  trace_count: 6,
  sensory_types: ["aroma", "color"],
}
const PARTY: MemorySphere = {
  id: "11111111-0000-4000-8000-000000000002",
  name: "Fiestas y amigos",
  explanation: "",
  emotion: "alegria",
  trace_count: 1,
  sensory_types: ["song"],
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

function mockMap(extra: Record<string, unknown> = {}) {
  return mockApi({
    "GET traces/catalog/": CATALOG,
    "GET memories/": ({ query }) => {
      let results = [CALM, PARTY]
      if (query.get("sensory_type")) results = results.filter((item) => item.sensory_types.includes(query.get("sensory_type")!))
      if (query.get("emotion")) results = results.filter((item) => item.emotion === query.get("emotion"))
      return { body: { total: 2, count: results.length, results } }
    },
    [`GET memories/${CALM.id}/`]: { body: CALM_DETAIL },
    ...extra,
  } as Parameters<typeof mockApi>[0])
}

const sphere = (name: RegExp | string) => screen.findByRole("button", { name }, { timeout: 5000 })
const openMap = () => renderApp({ path: "/recuerdos", user: SAMPLE_USER, locked: false })

// La página se carga en diferido: se importa antes para medir la pantalla y no la importación.
beforeAll(async () => {
  await import("@/pages/MemoriesPage")
}, 60_000)

describe("HU10 · Escenario 1: recuerdos como esferas sin orden cronológico", () => {
  it("cada esfera tiene el color de su emoción, su nombre y cuántas huellas guarda", async () => {
    mockMap()
    openMap()

    const calm = await sphere("Días de calma: Calma, 6 huellas")
    const party = screen.getByRole("button", { name: "Fiestas y amigos: Alegría, 1 huella" })
    expect(calm).toHaveAttribute("data-emotion", "calma")
    expect(party).toHaveAttribute("data-emotion", "alegria")
    expect(calm.getAttribute("style")).toContain("--sphere-color: var(--emotion-calma)")
    expect(screen.getByRole("heading", { name: "2 recuerdos" })).toBeInTheDocument()
  })

  it("el tamaño depende de la cantidad de huellas", async () => {
    mockMap()
    openMap()

    const calm = await sphere(/^Días de calma/)
    const party = screen.getByRole("button", { name: /^Fiestas y amigos/ })
    const orbSize = (button: HTMLElement) => Number.parseFloat((button.firstElementChild as HTMLElement).style.width)
    expect(orbSize(calm)).toBe(sphereDiameter(6))
    expect(orbSize(party)).toBe(sphereDiameter(1))
    expect(orbSize(calm)).toBeGreaterThan(orbSize(party))
  })

  it("el mapa no muestra fechas ni ordena por ellas", async () => {
    mockMap()
    openMap()

    const map = await screen.findByRole("list", { name: "Mapa de recuerdos" }, { timeout: 5000 })
    expect(map.querySelector("time")).toBeNull()
    // El orden lo da el id (estable), no la fecha ni el orden en que llegan.
    const many = Array.from({ length: 12 }, (_, index) => ({ ...PARTY, id: `id-${index}`, name: `R${index}` }))
    const order = arrangeSpheres(many).map((item) => item.sphere.name)
    expect(order).not.toEqual(many.map((item) => item.name))
    expect(arrangeSpheres(many).map((item) => item.sphere.name)).toEqual(order)
  })
})

describe("HU10 · Escenario 2: tocar una esfera o filtrar", () => {
  it("al tocar una esfera veo las huellas del recuerdo y por qué está junto", async () => {
    mockMap()
    const user = userEvent.setup()
    openMap()

    await user.click(await sphere(/^Días de calma/))

    const dialog = await screen.findByRole("dialog", { name: "Días de calma" })
    expect(within(dialog).getByText("Momentos tranquilos con lluvia y colores suaves.")).toBeInTheDocument()
    expect(await within(dialog).findByText("Olor a lluvia sobre el pasto.")).toBeInTheDocument()
    expect(within(dialog).getByText("La cobija suave del sofá.")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("una huella del recuerdo abre su detalle", async () => {
    mockMap({ "GET traces/t1/": { body: CALM_DETAIL.traces[0] } })
    const user = userEvent.setup()
    const router = openMap()

    await user.click(await sphere(/^Días de calma/))
    const dialog = await screen.findByRole("dialog", { name: "Días de calma" })
    await user.click(await within(dialog).findByText("Olor a lluvia sobre el pasto."))

    await waitFor(() => expect(router.state.location.pathname).toBe("/mis-huellas/t1"))
  })

  it("el filtro por sensación deja solo las esferas que coinciden", async () => {
    const fetchMock = mockMap()
    const user = userEvent.setup()
    openMap()

    await sphere(/^Días de calma/)
    await user.click(screen.getByRole("button", { name: "Filtrar por sensación o emoción" }))
    await user.click(within(screen.getByRole("group", { name: "Sensación" })).getByRole("button", { name: "Canción" }))

    await waitFor(() => expect(screen.queryByRole("button", { name: /^Días de calma/ })).not.toBeInTheDocument())
    expect(await sphere(/^Fiestas y amigos/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "1 recuerdo con estos filtros" })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("memories/?sensory_type=song"))).toBe(true)
  })

  it("el filtro por emoción deja solo las esferas de ese color", async () => {
    mockMap()
    const user = userEvent.setup()
    openMap()

    await sphere(/^Días de calma/)
    await user.click(screen.getByRole("button", { name: "Filtrar por sensación o emoción" }))
    await user.click(within(screen.getByRole("group", { name: "Emoción" })).getByRole("button", { name: "Calma" }))

    await waitFor(() => expect(screen.queryByRole("button", { name: /^Fiestas y amigos/ })).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: /^Días de calma/ })).toBeInTheDocument()
  })

  it("si ningún recuerdo coincide, lo dice y deja quitar los filtros", async () => {
    mockMap()
    const user = userEvent.setup()
    openMap()

    await sphere(/^Días de calma/)
    await user.click(screen.getByRole("button", { name: "Filtrar por sensación o emoción" }))
    await user.click(within(screen.getByRole("group", { name: "Emoción" })).getByRole("button", { name: "Miedo" }))

    expect(await screen.findByText("Ningún recuerdo coincide")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }))
    expect(await sphere(/^Días de calma/)).toBeInTheDocument()
  })
})

describe("HU10 · Escenario 3 y estados de la pantalla", () => {
  it("muestra 200 recuerdos", async () => {
    const results = Array.from({ length: 200 }, (_, index) => ({ ...PARTY, id: `m-${index}`, name: `Recuerdo ${index + 1}` }))
    mockApi({ "GET traces/catalog/": CATALOG, "GET memories/": { body: { total: 200, count: 200, results } } })
    openMap()

    await sphere(/^Recuerdo 1:/)
    expect(screen.getAllByTestId("memory-sphere")).toHaveLength(200)
    expect(screen.getByRole("heading", { name: "200 recuerdos" })).toBeInTheDocument()
  })

  it("sin recuerdos, invita a registrar una huella", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET memories/": { body: { total: 0, count: 0, results: [] } } })
    openMap()

    expect(await screen.findByText("Aún no tienes recuerdos", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar una huella" })).toHaveAttribute("href", "/nueva-huella")
    expect(screen.queryByRole("button", { name: "Filtrar por sensación o emoción" })).not.toBeInTheDocument()
  })

  it("si falla la carga, se puede reintentar", async () => {
    let calls = 0
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET memories/": () => (++calls === 1 ? { status: 500, body: { detail: "Error del servidor." } } : { body: { total: 1, count: 1, results: [CALM] } }),
    })
    const user = userEvent.setup()
    openMap()

    expect(await screen.findByText("No pudimos cargar tus recuerdos", {}, { timeout: 5000 })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await sphere(/^Días de calma/)).toBeInTheDocument()
  })

  it("«Recuerdos» está en la navegación principal", async () => {
    mockMap()
    openMap()

    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    expect(within(nav).getByRole("link", { name: "Recuerdos" })).toHaveAttribute("aria-current", "page")
  })
})
