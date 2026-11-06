import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TRACE_DELETED_NOTICE, TRACE_UPDATED_NOTICE } from "@/lib/messages"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }

function trace(id: string, sensory_type: string, emotion: string, note: string, minutesAgo: number, level = 3): Trace {
  const when = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  return { id, sensory_type, emotion, note, mood_intensity: level, tags: [], happened_at: null, created_at: when, updated_at: when }
}

// De la más reciente a la más antigua, como las devuelve el servidor.
const ALL = [
  trace("t4", "place", "calma", "El parque", 1),
  trace("t3", "aroma", "nostalgia", "Perfume de la abuela", 5, 4),
  trace("t2", "song", "alegria", "Canción del colegio", 10, 5),
  trace("t1", "aroma", "calma", "Café", 20),
]

const page = (results: Trace[]) => ({ body: { count: results.length, next: null, previous: null, results } })

/** Simula el filtro del servidor con los parámetros que manda la app. */
function listHandler(source: () => Trace[]) {
  return ({ query }: { query: URLSearchParams }) => {
    const type = query.get("sensory_type")
    const emotion = query.get("emotion")
    return page(source().filter((t) => (!type || t.sensory_type === type) && (!emotion || t.emotion === emotion)))
  }
}

const notesInList = () =>
  within(screen.getByRole("list", { name: "Lista de huellas" }))
    .getAllByRole("button")
    .map((card) => card.querySelector("p")?.textContent)

describe("HU3 · Escenario 1: filtrar por tipo o emoción, de la más reciente a la más antigua", () => {
  it("muestra todas mis huellas de la más reciente a la más antigua", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": listHandler(() => ALL) })
    renderApp({ path: "/mis-huellas", user: SAMPLE_USER, locked: false })

    await screen.findByRole("list", { name: "Lista de huellas" })
    expect(notesInList()).toEqual(["El parque", "Perfume de la abuela", "Canción del colegio", "Café"])
    expect(screen.getByRole("heading", { name: "4 huellas" })).toBeInTheDocument()
  })

  it("al filtrar por tipo muestra solo las que coinciden y lo pide al servidor", async () => {
    const fetchMock = mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": listHandler(() => ALL) })
    const user = userEvent.setup()
    const router = renderApp({ path: "/mis-huellas", user: SAMPLE_USER, locked: false })

    const types = await screen.findByRole("group", { name: "Tipo" })
    await user.click(within(types).getByRole("button", { name: "Aroma" }))

    await waitFor(() => expect(notesInList()).toEqual(["Perfume de la abuela", "Café"]))
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("sensory_type=aroma"))).toBe(true)
    expect(router.state.location.search).toBe("?tipo=aroma")
    expect(within(types).getByRole("button", { name: "Aroma" })).toHaveAttribute("aria-pressed", "true")
  })

  it("al filtrar por emoción muestra solo las que coinciden", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": listHandler(() => ALL) })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas", user: SAMPLE_USER, locked: false })

    const emotions = await screen.findByRole("group", { name: "Emoción" })
    await user.click(within(emotions).getByRole("button", { name: "Calma" }))

    await waitFor(() => expect(notesInList()).toEqual(["El parque", "Café"]))
  })

  it("combina tipo y emoción, y sin coincidencias ofrece quitar los filtros", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": listHandler(() => ALL) })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas?tipo=song&emocion=calma", user: SAMPLE_USER, locked: false })

    expect(await screen.findByRole("heading", { name: "Ninguna huella coincide" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }))

    await waitFor(() => expect(notesInList()).toHaveLength(4))
  })
})

describe("HU3 · Escenario 2: abrir una huella, cambiar nota, emoción o intensidad y guardar", () => {
  it("guarda los cambios y vuelve a la lista con la huella actualizada", async () => {
    let current = [...ALL]
    const fetchMock = mockApi({
      "GET traces/catalog/": CATALOG,
      "GET traces/": listHandler(() => current),
      "GET traces/t1/": { body: ALL[3] },
      "PATCH traces/t1/": ({ body }) => {
        const updated = { ...ALL[3], ...(body as Partial<Trace>) }
        current = current.map((t) => (t.id === "t1" ? updated : t))
        return { body: updated }
      },
    })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("button", { name: /Café$/ }))
    const save = await screen.findByRole("button", { name: "Guardar cambios" })
    expect(save).toBeDisabled()

    const note = screen.getByLabelText("Nota")
    await user.clear(note)
    await user.type(note, "Café con canela")
    await user.click(screen.getByRole("radio", { name: "Gratitud" }))
    await user.click(screen.getByRole("radio", { name: /5 de 5/ }))
    await user.click(save)

    expect(await screen.findByText(TRACE_UPDATED_NOTICE)).toBeInTheDocument()
    expect(sentBody(fetchMock, "PATCH traces/t1/")).toEqual({ note: "Café con canela", emotion: "gratitud", mood_intensity: 5 })
    const card = await screen.findByRole("button", { name: /Café con canela$/ })
    expect(within(card).getByText("Gratitud")).toBeInTheDocument()
    expect(within(card).getByRole("img", { name: "Intensidad 5 de 5" })).toBeInTheDocument()
  })

  it("no deja guardar una nota vacía", async () => {
    const fetchMock = mockApi({ "GET traces/catalog/": CATALOG, "GET traces/t1/": { body: ALL[3] } })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas/t1", user: SAMPLE_USER, locked: false })

    await user.clear(await screen.findByLabelText("Nota"))
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText("Escribe una nota corta sobre el recuerdo.")).toBeInTheDocument()
    expect(sentBody(fetchMock, "PATCH traces/t1/")).toBeUndefined()
  })

  it("una huella que ya no existe muestra un aviso claro", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/zzz/": { status: 404, body: { detail: "No encontrado." } } })
    renderApp({ path: "/mis-huellas/zzz", user: SAMPLE_USER, locked: false })

    expect(await screen.findByRole("heading", { name: "Esta huella ya no existe" })).toBeInTheDocument()
  })
})

describe("HU3 · Escenario 3: borrar una huella con confirmación", () => {
  it("cancelar no borra nada", async () => {
    const fetchMock = mockApi({ "GET traces/catalog/": CATALOG, "GET traces/t3/": { body: ALL[1] } })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas/t3", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("button", { name: "Borrar huella" }))
    const dialog = await screen.findByRole("dialog", { name: "¿Borrar esta huella?" })
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false)
  })

  it("al confirmar, la huella desaparece de mi lista", async () => {
    let current = [...ALL]
    const fetchMock = mockApi({
      "GET traces/catalog/": CATALOG,
      "GET traces/": listHandler(() => current),
      "GET traces/t3/": { body: ALL[1] },
      "DELETE traces/t3/": () => {
        current = current.filter((t) => t.id !== "t3")
        return { status: 204 }
      },
    })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("button", { name: /Perfume de la abuela$/ }))
    await user.click(await screen.findByRole("button", { name: "Borrar huella" }))
    const dialog = await screen.findByRole("dialog", { name: "¿Borrar esta huella?" })
    expect(within(dialog).getByText(/de los recuerdos que la incluían/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Sí, borrar" }))

    expect(await screen.findByText(TRACE_DELETED_NOTICE)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input, init]) => init?.method === "DELETE" && String(input).endsWith("traces/t3/"))).toBe(true)
    await waitFor(() => expect(notesInList()).toEqual(["El parque", "Canción del colegio", "Café"]))
  })
})
