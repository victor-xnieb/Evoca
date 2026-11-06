import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import { findRiskTerms, type OrientationStatus, type SupportContent } from "@/lib/support"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const EMPTY_PAGE = { body: { count: 0, next: null, previous: null, results: [] } }

const CONTENT: SupportContent = {
  version: 1,
  draft: true,
  orientation_title: "Aquí hay apoyo si lo necesitas",
  orientation_message: "En las últimas semanas has registrado varios días difíciles. Hablar con alguien puede ayudar.",
  help_title: "Puedes hablar con alguien ahora",
  help_message: "Lo que sientes importa. Llama a una de estas líneas.",
  help_lines: [
    { name: "Línea 192, opción 4", phone: "192", description: "Salud mental · Ministerio de Salud" },
    { name: "Línea 106", phone: "106", description: "Escucha y orientación en Bogotá" },
  ],
  risk_terms: ["quiero morir", "quitarme la vida", "hacerme daño", "cortarme"],
  updated_at: "2026-11-06T10:00:00Z",
}

function orientation(show: boolean): { body: OrientationStatus } {
  return {
    body: {
      show,
      reason: show ? "low_mood" : "not_enough_low_days",
      low_days: show ? 14 : 3,
      window_days: 21,
      low_days_needed: 14,
    },
  }
}

/** Tipos de evento enviados, en orden. */
function sentEvents(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls
    .filter(([input, init]) => init?.method === "POST" && String(input).endsWith("support/events/"))
    .map(([, init]) => JSON.parse(String(init?.body)))
}

/** Espera a que la app haya pedido el contenido vigente al servidor. */
async function contentRequested(fetchMock: ReturnType<typeof mockApi>) {
  await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("support/content/"))).toBe(true))
}

const DIAGNOSTIC = /depresi|trastorno|diagn[oó]stico|enfermedad|patolog/i

beforeAll(async () => {
  // Las pantallas diferidas se cargan una vez antes de medir (la primera importación es lenta).
  await Promise.all([import("@/pages/NewTracePage"), import("@/pages/TraceDetailPage"), import("@/pages/HelpPage")])
})

describe("HU6 · Escenario 1: con ánimo bajo en 14 de 21 días, al abrir la app aparece la orientación", () => {
  it("muestra un mensaje cálido y sin diagnóstico, y «Ahora no» lo cierra y queda registrado", async () => {
    const fetchMock = mockApi({
      "GET traces/": EMPTY_PAGE,
      "GET support/orientation/": orientation(true),
      "GET support/content/": { body: CONTENT },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    const card = (await screen.findByRole("heading", { name: CONTENT.orientation_title })).closest("section")!
    expect(within(card).getByText(CONTENT.orientation_message)).toBeInTheDocument()
    expect(card.textContent).not.toMatch(DIAGNOSTIC)
    expect(within(card).getByText(/Contenido provisional/)).toBeInTheDocument()

    await user.click(within(card).getByRole("button", { name: "Ahora no" }))

    expect(screen.queryByRole("heading", { name: CONTENT.orientation_title })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(sentEvents(fetchMock)).toEqual([{ kind: "orientation_shown" }, { kind: "orientation_dismissed" }]),
    )
  })

  it("abrir la ruta de ayuda queda registrado y muestra las líneas para llamar", async () => {
    const fetchMock = mockApi({
      "GET traces/": EMPTY_PAGE,
      "GET support/orientation/": orientation(true),
      "GET support/content/": { body: CONTENT },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    const router = renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("button", { name: "Ver opciones de ayuda" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/ayuda"))
    expect(await screen.findByRole("heading", { name: "Ayuda profesional" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Línea 192, opción 4/ })).toHaveAttribute("href", "tel:192")
    await waitFor(() => expect(sentEvents(fetchMock)).toContainEqual({ kind: "help_opened" }))
  })

  it("si el ánimo no cumple la regla, no aparece nada", async () => {
    const fetchMock = mockApi({
      "GET traces/": EMPTY_PAGE,
      "GET support/orientation/": orientation(false),
      "GET support/content/": { body: CONTENT },
    })
    renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    expect(await screen.findByText("Aún no tienes huellas")).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("support/orientation/"))).toBe(true))
    expect(screen.queryByRole("heading", { name: CONTENT.orientation_title })).not.toBeInTheDocument()
    expect(sentEvents(fetchMock)).toEqual([])
  })
})

describe("HU6 · Escenario 2: al escribir una palabra de riesgo aparece de inmediato la ayuda", () => {
  function openNewTrace() {
    window.localStorage.setItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`, "1")
    return renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })
  }

  it("al completar la frase se abre la pantalla con las líneas, sin guardar ni enviar la nota", async () => {
    const fetchMock = mockApi({
      "GET traces/catalog/": CATALOG,
      "GET support/content/": { body: CONTENT },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    openNewTrace()

    const note = await screen.findByLabelText("Escribe una nota corta")
    await contentRequested(fetchMock)
    await user.type(note, "Hoy siento que quiero mori")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.type(note, "r")

    // Sin pasos intermedios: la pantalla y sus líneas están a la vista con la última letra.
    const dialog = screen.getByRole("dialog", { name: CONTENT.help_title })
    expect(within(dialog).getByRole("link", { name: /Línea 192, opción 4/ })).toHaveAttribute("href", "tel:192")
    expect(within(dialog).getByRole("link", { name: /Línea 106/ })).toHaveAttribute("href", "tel:106")
    expect(dialog.textContent).not.toMatch(DIAGNOSTIC)
    await waitFor(() => expect(sentEvents(fetchMock)).toEqual([{ kind: "risk_screen_shown" }]))
    expect(fetchMock.mock.calls.some(([input, init]) => init?.method === "POST" && String(input).endsWith("traces/"))).toBe(false)
  })

  it("al volver a la nota no se reabre por la misma frase, pero sí por una nueva", async () => {
    const fetchMock = mockApi({
      "GET traces/catalog/": CATALOG,
      "GET support/content/": { body: CONTENT },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    openNewTrace()

    const note = await screen.findByLabelText("Escribe una nota corta")
    await contentRequested(fetchMock)
    await user.type(note, "Quiero morir")
    await user.click(await screen.findByRole("button", { name: "Volver a mi nota" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(note).toHaveValue("Quiero morir")
    expect(note).toHaveFocus()
    await user.type(note, " y nada más")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.type(note, ", pienso en cortarme")
    expect(screen.getByRole("dialog", { name: CONTENT.help_title })).toBeInTheDocument()
  })

  it("al editar una huella, lo que ya estaba escrito no la abre; una frase nueva sí", async () => {
    const trace: Trace = {
      id: "t1",
      sensory_type: "song",
      note: "Ese día pensé en quitarme la vida",
      emotion: "tristeza",
      mood_intensity: 1,
      tags: [],
      happened_at: null,
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    }
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET traces/t1/": { body: trace },
      "GET support/content/": { body: CONTENT },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    renderApp({ path: "/mis-huellas/t1", user: SAMPLE_USER, locked: false })

    const note = await screen.findByLabelText("Nota")
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.type(note, ". Hoy quiero hacerme daño")

    expect(screen.getByRole("dialog", { name: CONTENT.help_title })).toBeInTheDocument()
  })

  it("reconoce las frases sin importar mayúsculas, tildes ni signos, y no dentro de otras palabras", () => {
    const terms = ["hacerme daño", "cortarme"]

    expect(findRiskTerms("QUIERO HACERME DANO!!", terms)).toEqual(["hacerme daño"])
    expect(findRiskTerms("hacerme, daño", terms)).toEqual(["hacerme daño"])
    expect(findRiskTerms("Voy a recortarme el pelo", terms)).toEqual([])
    expect(findRiskTerms("", terms)).toEqual([])
  })
})

describe("HU6 · Escenario 3: los textos y las palabras aprobados se actualizan sin publicar la app", () => {
  it("usa la versión que entrega el servidor: palabras y textos nuevos, sin marca de provisional", async () => {
    const approved: SupportContent = {
      ...CONTENT,
      version: 2,
      draft: false,
      help_title: "Texto aprobado por el psicólogo asesor",
      risk_terms: ["frase nueva aprobada"],
    }
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET support/content/": { body: approved },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    window.localStorage.setItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`, "1")
    renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })

    const note = await screen.findByLabelText("Escribe una nota corta")
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("evoca.support") ?? "{}").version).toBe(2))
    await user.type(note, "quiero morir")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.type(note, " es una frase nueva aprobada")

    const dialog = screen.getByRole("dialog", { name: "Texto aprobado por el psicólogo asesor" })
    expect(within(dialog).queryByText(/Contenido provisional/)).not.toBeInTheDocument()
  })

  it("sin conexión usa la última versión recibida", async () => {
    window.localStorage.setItem("evoca.support", JSON.stringify({ ...CONTENT, version: 5, help_title: "Versión guardada" }))
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET support/content/": { status: 503, body: { detail: "Sin conexión." } },
      "POST support/events/": { status: 201, body: {} },
    })
    const user = userEvent.setup()
    window.localStorage.setItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`, "1")
    renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })

    await user.type(await screen.findByLabelText("Escribe una nota corta"), "quiero morir")

    expect(screen.getByRole("dialog", { name: "Versión guardada" })).toBeInTheDocument()
  })
})
