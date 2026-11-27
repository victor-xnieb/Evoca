import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { WeeklySummary } from "@/lib/weekly"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody, type MockReply } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const EMPTY_PAGE = { body: { count: 0, next: null, previous: null, results: [] } }
const BASE = {
  "GET traces/catalog/": { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } },
  "GET traces/": EMPTY_PAGE,
  "GET support/orientation/": { body: { show: false } },
}

const WEEK = { enabled: true, week_start: "2026-11-16", week_end: "2026-11-22", required: 5, missing: 0 }

const READY: WeeklySummary = {
  ...WEEK,
  status: "ready",
  count: 7,
  patterns: [
    {
      text: "Las tardes en que registraste canciones tu ánimo fue más alto que el resto de la semana.",
      trace_count: 3,
      traces: [
        { id: "t1", date: "2026-11-17T20:00:00-05:00", sensory_type: "song", emotion: "alegria", mood_intensity: 5, mood: 5, note: "Salsa en la sala." },
        { id: "t2", date: "2026-11-19T18:00:00-05:00", sensory_type: "song", emotion: "tristeza", mood_intensity: 5, mood: 1, note: "Una canción triste." },
      ],
    },
    { text: "Los aromas de la mañana acompañaron un ánimo tranquilo.", trace_count: 2, traces: [] },
  ],
}

type Handler = MockReply | ((request: { body: unknown; query: URLSearchParams }) => MockReply)

function mockWeekly(get: Handler, generate?: Handler, extra: Record<string, Handler> = {}) {
  return mockApi({
    ...BASE,
    "GET weekly-summary/": get,
    ...(generate ? { "POST weekly-summary/generate/": generate } : {}),
    ...extra,
  })
}

const openHome = () => renderApp({ path: "/", user: SAMPLE_USER, locked: false })
const weekCard = () => screen.findByRole("region", { name: "Tu semana" }, { timeout: 5000 })

describe("HU14 · Escenario 1: con 5 registros o más en la semana llegan de 1 a 3 patrones", () => {
  it("si aún no está preparado, lo pide a la IA y lo muestra en Inicio", async () => {
    const fetchMock = mockWeekly({ body: { ...WEEK, status: "pending", count: 7, patterns: [] } }, { body: READY })
    openHome()
    const card = await weekCard()

    expect(within(card).getByText("Del 16 al 22 de noviembre · 7 registros")).toBeInTheDocument()
    const patterns = await within(card).findByRole("list", { name: "Patrones de tu semana" })
    expect(within(patterns).getAllByRole("listitem")).toHaveLength(2)
    expect(patterns).toHaveTextContent("Las tardes en que registraste canciones tu ánimo fue más alto")
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("si ya está preparado, no vuelve a pedirlo", async () => {
    const fetchMock = mockWeekly({ body: READY })
    openHome()
    await within(await weekCard()).findByRole("list", { name: "Patrones de tu semana" })
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("con menos de 5 registros dice cuántos faltaron y no pide nada a la IA", async () => {
    const fetchMock = mockWeekly({ body: { ...WEEK, status: "too_few", count: 4, missing: 1, patterns: [] } })
    openHome()
    const card = await weekCard()

    expect(card).toHaveTextContent("La semana pasada registraste 4 huellas. Con 5 o más te mostramos patrones entre tus huellas y tu ánimo: faltó 1.")
    expect(within(card).queryByRole("list")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("mientras la IA lo prepara, lo dice", async () => {
    let finish: (reply: MockReply) => void = () => {}
    const waiting = new Promise<MockReply>((resolve) => {
      finish = resolve
    })
    mockWeekly({ body: { ...WEEK, status: "pending", count: 7, patterns: [] } })
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST" && String(input).includes("weekly-summary/generate/")) {
        const reply = await waiting
        return new Response(JSON.stringify(reply.body), { status: 200, headers: { "content-type": "application/json" } })
      }
      return original(input, init)
    }) as typeof fetch
    openHome()
    const card = await weekCard()

    expect(await within(card).findByRole("status")).toHaveTextContent("Estamos preparando tu resumen de la semana…")
    finish({ body: READY })
    await waitFor(() => expect(within(card).queryByRole("status")).not.toBeInTheDocument())
  })

  it("si la IA falla, lo dice y permite intentar de nuevo", async () => {
    let attempts = 0
    mockWeekly({ body: { ...WEEK, status: "pending", count: 7, patterns: [] } }, () => {
      attempts += 1
      return { body: attempts === 1 ? { ...WEEK, status: "unavailable", count: 7, patterns: [] } : READY }
    })
    openHome()
    const card = await weekCard()

    expect(await within(card).findByText("No pudimos preparar tu resumen ahora. Tus huellas están a salvo.")).toBeInTheDocument()
    await userEvent.click(within(card).getByRole("button", { name: "Intentar de nuevo" }))
    expect(await within(await weekCard()).findByRole("list", { name: "Patrones de tu semana" })).toBeInTheDocument()
  })

  it("si no se puede consultar, Inicio sigue igual sin la tarjeta", async () => {
    mockWeekly({ status: 500, body: { detail: "Error" } })
    openHome()
    await screen.findByRole("heading", { name: /Aún no tienes huellas/ }, { timeout: 5000 })
    await waitFor(() => expect(screen.queryByRole("region", { name: "Tu semana" })).not.toBeInTheDocument())
  })
})

describe("HU14 · Escenario 2: cada patrón es una observación y dice con qué registros se calculó", () => {
  it("muestra los registros de un patrón, con su ánimo, y lleva a cada huella", async () => {
    mockWeekly({ body: READY })
    const user = userEvent.setup()
    openHome()
    const card = await weekCard()

    const toggle = await within(card).findByRole("button", { name: "Calculado con 3 registros" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const list = within(card).getByRole("list", { name: "Registros del patrón 1" })
    const links = within(list).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/mis-huellas/t1", "/mis-huellas/t2"])
    expect(links[1]).toHaveTextContent("Una canción triste.")
    expect(links[1]).toHaveTextContent("Canción · Tristeza 5 · ánimo 1 de 5")
    // Uno de los tres registros se borró después.
    expect(list).toHaveTextContent("Un registro ya no está: lo borraste.")
  })

  it("aclara que son observaciones y no diagnósticos, y cómo desactivarlo", async () => {
    mockWeekly({ body: READY })
    openHome()
    const card = await weekCard()
    expect(await within(card).findByText(/Son observaciones de tus registros, no diagnósticos\./)).toBeInTheDocument()
    expect(within(card).getByRole("link", { name: "Ajustes" })).toHaveAttribute("href", "/ajustes")
  })
})

describe("HU14 · Escenario 3: al desactivar el resumen semanal deja de llegar", () => {
  it("desactivado, la tarjeta no aparece en Inicio", async () => {
    const fetchMock = mockWeekly({ body: { ...WEEK, enabled: false, status: "disabled", count: 0, patterns: [] } })
    openHome()
    await screen.findByRole("heading", { name: /Aún no tienes huellas/ }, { timeout: 5000 })
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("weekly-summary/"))).toBe(true))
    expect(screen.queryByRole("region", { name: "Tu semana" })).not.toBeInTheDocument()
  })

  it("en Ajustes se desactiva y se vuelve a activar", async () => {
    let enabled = true
    const fetchMock = mockApi({
      "GET auth/reminder/": { body: { enabled: false, time: "20:00", frequency: "daily", last_notified_on: null } },
      "GET weekly-summary/settings/": () => ({ body: { enabled } }),
      "PUT weekly-summary/settings/": ({ body }) => {
        enabled = (body as { enabled: boolean }).enabled
        return { body: { enabled } }
      },
    })
    const user = userEvent.setup()
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    const toggle = await screen.findByRole("switch", { name: "Recibir el resumen semanal" }, { timeout: 5000 })
    expect(toggle).toHaveAttribute("aria-checked", "true")
    await user.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"))
    expect(sentBody(fetchMock, "PUT weekly-summary/settings/")).toEqual({ enabled: false })
    expect(screen.getByText("Desactivaste el resumen semanal: ya no aparecerá en Inicio.")).toBeInTheDocument()

    await user.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))
  })
})
