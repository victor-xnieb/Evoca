import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { MISSING_TRACE_FIELDS } from "@/lib/messages"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const EMPTY_PAGE = { body: { count: 0, next: null, previous: null, results: [] } }

const savedTrace: Trace = {
  id: "trace-1",
  sensory_type: "aroma",
  note: "El café de la abuela",
  emotion: "nostalgia",
  mood_intensity: 4,
  tags: [],
  happened_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function openNewTrace({ firstTime = false } = {}) {
  if (!firstTime) window.localStorage.setItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`, "1")
  return renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })
}

describe("HU2 · Escenario 1: elegir el tipo, escribir la nota y ejemplo guiado la primera vez", () => {
  it("la primera vez muestra un ejemplo guiado que se puede omitir", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": EMPTY_PAGE })
    const user = userEvent.setup()
    openNewTrace({ firstTime: true })

    expect(await screen.findByRole("heading", { name: "Así se registra un recuerdo" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Omitir" }))

    expect(await screen.findByRole("radiogroup", { name: "¿Qué despertó este recuerdo?" })).toBeInTheDocument()
    expect(window.localStorage.getItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`)).toBe("1")
  })

  it("el ejemplo se puede recorrer hasta el final y lleva al formulario", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": EMPTY_PAGE })
    const user = userEvent.setup()
    openNewTrace({ firstTime: true })

    await screen.findByRole("heading", { name: "Así se registra un recuerdo" })
    await user.click(screen.getByRole("button", { name: "Siguiente" }))
    await user.click(await screen.findByRole("button", { name: "Siguiente" }))
    await user.click(await screen.findByRole("button", { name: "Registrar mi huella" }))

    expect(await screen.findByRole("heading", { name: "Nueva huella" })).toBeInTheDocument()
  })

  it("si ya tiene huellas no muestra el ejemplo", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/": { body: { count: 3, next: null, previous: null, results: [] } } })
    renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })

    expect(await screen.findByRole("heading", { name: "Nueva huella" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Así se registra un recuerdo" })).not.toBeInTheDocument()
  })

  it("ofrece los 6 tipos y acepta el tipo elegido y una nota corta", async () => {
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()

    const types = await screen.findByRole("radiogroup", { name: "¿Qué despertó este recuerdo?" })
    expect(within(types).getAllByRole("radio").map((radio) => radio.textContent)).toEqual([
      "Aroma",
      "Color",
      "Canción",
      "Sabor",
      "Textura",
      "Lugar",
    ])
    await user.click(within(types).getByRole("radio", { name: "Canción" }))
    expect(within(types).getByRole("radio", { name: "Canción" })).toHaveAttribute("aria-checked", "true")

    const note = screen.getByLabelText("Escribe una nota corta")
    await waitFor(() => expect(note).toHaveFocus())
    await user.type(note, "La que sonaba en el bus del colegio")
    expect(note).toHaveValue("La que sonaba en el bus del colegio")
    expect(screen.getByText("35/500")).toBeInTheDocument()
  })
})

describe("HU2 · Escenario 2: sin emoción o intensidad no guarda y dice qué falta", () => {
  it("sin emoción ni intensidad muestra qué falta y no envía nada", async () => {
    const fetchMock = mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Aroma" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), "Café recién hecho")
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    const alert = await screen.findByText("Para guardar falta:")
    const summary = alert.closest("[role=alert]") as HTMLElement
    expect(within(summary).getByText(MISSING_TRACE_FIELDS.emotion)).toBeInTheDocument()
    expect(within(summary).getByText(MISSING_TRACE_FIELDS.mood_intensity)).toBeInTheDocument()
    expect(sentBody(fetchMock, "POST traces/")).toBeUndefined()
  })

  it("si solo falta la intensidad, dice solo eso", async () => {
    const fetchMock = mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Color" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), "El azul del mar")
    await user.click(screen.getByRole("radio", { name: "Calma" }))
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    const summary = (await screen.findByText("Para guardar falta:")).closest("[role=alert]") as HTMLElement
    expect(within(summary).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      MISSING_TRACE_FIELDS.mood_intensity,
    ])
    expect(sentBody(fetchMock, "POST traces/")).toBeUndefined()
  })
})

describe("HU2 · Escenario 3: guardar la huella, verla en mi lista, en menos de 30 s", () => {
  it("guarda tipo, nota, emoción e intensidad y la huella aparece en mi lista", async () => {
    let created = false
    const fetchMock = mockApi({
      "GET traces/catalog/": CATALOG,
      "POST traces/": () => {
        created = true
        return { status: 201, body: savedTrace }
      },
      "GET traces/": () => (created ? { body: { count: 1, next: null, previous: null, results: [savedTrace] } } : EMPTY_PAGE),
    })
    const user = userEvent.setup()
    openNewTrace()

    // Cuatro toques más la nota: tipo, emoción, intensidad y guardar.
    await user.click(await screen.findByRole("radio", { name: "Aroma" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), "El café de la abuela")
    await user.click(screen.getByRole("radio", { name: "Nostalgia" }))
    await user.click(screen.getByRole("radio", { name: /4 de 5/ }))
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    expect(await screen.findByText("Guardaste tu huella.")).toBeInTheDocument()
    expect(sentBody(fetchMock, "POST traces/")).toEqual({
      sensory_type: "aroma",
      note: "El café de la abuela",
      emotion: "nostalgia",
      mood_intensity: 4,
    })
    const list = screen.getByRole("list", { name: "Huellas recientes" })
    expect(within(list).getByText("El café de la abuela")).toBeInTheDocument()
    expect(within(list).getByText("Nostalgia")).toBeInTheDocument()
  })

  it("todo el registro cabe en una sola pantalla y no pide más que lo necesario", async () => {
    mockApi({ "GET traces/catalog/": CATALOG })
    openNewTrace()

    await screen.findByRole("heading", { name: "Nueva huella" })
    // Solo 4 decisiones: tipo, nota, emoción e intensidad (sin pasos extra ni campos opcionales).
    expect(screen.getAllByRole("radiogroup")).toHaveLength(3)
    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Guardar huella" })).toHaveLength(1)
  })

  it("si el servidor rechaza un campo, muestra su motivo", async () => {
    mockApi({
      "GET traces/catalog/": CATALOG,
      "POST traces/": { status: 400, body: { emotion: ["Esa emoción no está en la lista."] } },
    })
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Lugar" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), "El parque del barrio")
    await user.click(screen.getByRole("radio", { name: "Alegría" }))
    await user.click(screen.getByRole("radio", { name: /3 de 5/ }))
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    expect(await screen.findAllByText("Esa emoción no está en la lista.")).not.toHaveLength(0)
  })
})
