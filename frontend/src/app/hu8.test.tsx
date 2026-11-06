import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { countWords, SUGGEST_PAUSE_MS, SUGGEST_TIMEOUT_MS, type SuggestionResponse } from "@/lib/suggestion"
import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const EMPTY_PAGE = { body: { count: 0, next: null, previous: null, results: [] } }

const TEN_WORDS = "El olor a pan me recordó las mañanas con abuela"
const NINE_WORDS = "El olor a pan me recordó las mañanas contigo"

const savedTrace: Trace = {
  id: "trace-1",
  sensory_type: "aroma",
  note: TEN_WORDS,
  emotion: "nostalgia",
  mood_intensity: 4,
  tags: [],
  happened_at: null,
  created_at: "2026-11-06T10:00:00Z",
  updated_at: "2026-11-06T10:00:00Z",
}

function suggestion(overrides: Partial<SuggestionResponse> = {}): { body: SuggestionResponse } {
  return {
    body: {
      suggestion: { emotion: "nostalgia", intensity: 4, confidence: 0.9 },
      reason: "ok",
      min_words: 10,
      ...overrides,
    },
  }
}

function handlers(suggest: Parameters<typeof mockApi>[0][string] = suggestion()) {
  return {
    "GET traces/catalog/": CATALOG,
    "GET traces/": EMPTY_PAGE,
    "POST traces/suggest/": suggest,
    "POST traces/": { status: 201, body: savedTrace },
  }
}

function suggestCalls(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.filter(([input]) => String(input).includes("traces/suggest/"))
}

function openNewTrace() {
  window.localStorage.setItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`, "1")
  return renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })
}

beforeAll(async () => {
  await import("@/pages/NewTracePage")
})

describe("HU8 · Escenario 1: con 10 palabras o más, al terminar de escribir llega la sugerencia en menos de 3 s", () => {
  it("la espera máxima (pausa al escribir + respuesta) es menor a 3 s", () => {
    expect(SUGGEST_PAUSE_MS + SUGGEST_TIMEOUT_MS).toBeLessThan(3000)
  })

  it("cuenta las palabras como el servidor", () => {
    expect(countWords(TEN_WORDS)).toBe(10)
    expect(countWords(NINE_WORDS)).toBe(9)
    expect(countWords("  ¡Hola,   mundo!  ")).toBe(2)
  })

  it("al dejar de escribir propone emoción e intensidad y solo envía la nota", async () => {
    const fetchMock = mockApi(handlers())
    const user = userEvent.setup()
    openNewTrace()

    await user.type(await screen.findByLabelText("Escribe una nota corta"), TEN_WORDS)
    const finished = Date.now()

    const card = await screen.findByRole("region", { name: "Sugerencia de la IA" }, { timeout: 3000 })
    expect(Date.now() - finished).toBeLessThan(3000)
    expect(within(card).getByText("Nostalgia")).toBeInTheDocument()
    expect(within(card).getByText("Intensidad 4 · Alta")).toBeInTheDocument()
    expect(sentBody(fetchMock, "POST traces/suggest/")).toEqual({ note: TEN_WORDS })
    // Escribir letra por letra no dispara una petición por letra: solo al hacer la pausa.
    expect(suggestCalls(fetchMock)).toHaveLength(1)
  })

  it("si la nota cambia, la sugerencia anterior desaparece hasta que llega la nueva", async () => {
    let calls = 0
    mockApi(
      handlers(() => {
        calls += 1
        return calls === 1 ? suggestion() : suggestion({ suggestion: { emotion: "alegria", intensity: 5, confidence: 0.9 } })
      }),
    )
    const user = userEvent.setup()
    openNewTrace()

    const note = await screen.findByLabelText("Escribe una nota corta")
    await user.type(note, TEN_WORDS)
    const first = await screen.findByRole("region", { name: "Sugerencia de la IA" }, { timeout: 3000 })
    expect(within(first).getByText("Nostalgia")).toBeInTheDocument()

    await user.type(note, " y sonreí")
    // Mientras la nota nueva no tiene su sugerencia, la anterior ya no se ofrece.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Aceptar sugerencia" })).not.toBeInTheDocument())

    await waitFor(() => expect(calls).toBe(2), { timeout: 3000 })
    const card = await screen.findByRole("region", { name: "Sugerencia de la IA" }, { timeout: 3000 })
    await waitFor(() => expect(within(card).getByText("Alegría")).toBeInTheDocument())
  })

  it("con 9 palabras no pide sugerencia", async () => {
    const fetchMock = mockApi(handlers())
    const user = userEvent.setup()
    openNewTrace()

    await user.type(await screen.findByLabelText("Escribe una nota corta"), NINE_WORDS)
    await new Promise((resolve) => setTimeout(resolve, SUGGEST_PAUSE_MS + 300))

    expect(suggestCalls(fetchMock)).toHaveLength(0)
    expect(screen.queryByRole("region", { name: "Sugerencia de la IA" })).not.toBeInTheDocument()
  })
})

describe("HU8 · Escenario 2: si acepto o cambio la sugerencia, se guarda mi elección", () => {
  it("al aceptarla se eligen esa emoción e intensidad, y se guardan", async () => {
    const fetchMock = mockApi(handlers())
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Aroma" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), TEN_WORDS)
    await user.click(await screen.findByRole("button", { name: "Aceptar sugerencia" }, { timeout: 3000 }))

    expect(screen.getByRole("radio", { name: "Nostalgia" })).toBeChecked()
    expect(screen.getByRole("radio", { name: /4 de 5/ })).toBeChecked()
    expect(screen.getByText("Aceptada · puedes cambiarla abajo")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    await waitFor(() =>
      expect(sentBody(fetchMock, "POST traces/")).toEqual({
        sensory_type: "aroma",
        note: TEN_WORDS,
        emotion: "nostalgia",
        mood_intensity: 4,
      }),
    )
  })

  it("si la cambio después de aceptarla, se guarda mi cambio y no la sugerencia", async () => {
    const fetchMock = mockApi(handlers())
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Aroma" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), TEN_WORDS)
    await user.click(await screen.findByRole("button", { name: "Aceptar sugerencia" }, { timeout: 3000 }))
    await user.click(screen.getByRole("radio", { name: "Gratitud" }))
    await user.click(screen.getByRole("radio", { name: /2 de 5/ }))

    expect(screen.getByRole("button", { name: "Aceptar sugerencia" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    await waitFor(() => expect(sentBody(fetchMock, "POST traces/")).toMatchObject({ emotion: "gratitud", mood_intensity: 2 }))
  })

  it("si no la uso, la sugerencia no cambia nada de lo que elijo", async () => {
    const fetchMock = mockApi(handlers())
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Aroma" }))
    await user.click(screen.getByRole("radio", { name: "Alegría" }))
    await user.click(screen.getByRole("radio", { name: /5 de 5/ }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), TEN_WORDS)
    await screen.findByRole("region", { name: "Sugerencia de la IA" }, { timeout: 3000 })

    expect(screen.getByRole("radio", { name: "Alegría" })).toBeChecked()
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    await waitFor(() => expect(sentBody(fetchMock, "POST traces/")).toMatchObject({ emotion: "alegria", mood_intensity: 5 }))
  })
})

describe("HU8 · Escenario 3: sin IA o sin confianza suficiente, el registro funciona sin sugerencia", () => {
  async function registerWithoutSuggestion(fetchMock: ReturnType<typeof mockApi>) {
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Aroma" }))
    await user.type(screen.getByLabelText("Escribe una nota corta"), TEN_WORDS)
    await waitFor(() => expect(suggestCalls(fetchMock).length).toBe(1), { timeout: 3000 })
    await waitFor(() => expect(screen.queryByText("La IA está leyendo tu nota…")).not.toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByRole("region", { name: "Sugerencia de la IA" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: "Nostalgia" }))
    await user.click(screen.getByRole("radio", { name: /4 de 5/ }))
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))
    await waitFor(() => expect(sentBody(fetchMock, "POST traces/")).toMatchObject({ emotion: "nostalgia", mood_intensity: 4 }))
  }

  it("si la IA no está disponible", async () => {
    await registerWithoutSuggestion(mockApi(handlers(suggestion({ suggestion: null, reason: "unavailable" }))))
  })

  it("si la IA no tiene confianza suficiente", async () => {
    await registerWithoutSuggestion(mockApi(handlers(suggestion({ suggestion: null, reason: "low_confidence" }))))
  })

  it("si el servidor falla", async () => {
    await registerWithoutSuggestion(mockApi(handlers({ status: 500, body: { detail: "Error" } })))
  })

  it("si la respuesta tarda demasiado, se deja de esperar antes de 3 s", async () => {
    const fetchMock = mockApi(handlers())
    const mocked = fetchMock.getMockImplementation()!
    // La sugerencia nunca responde: solo termina cuando la app cancela la espera.
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).includes("traces/suggest/")) return mocked(input, init)
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Cancelada", "AbortError")))
      })
    })
    const abort = vi.fn()
    const user = userEvent.setup()
    openNewTrace()

    await user.type(await screen.findByLabelText("Escribe una nota corta"), TEN_WORDS)
    const finished = Date.now()
    await waitFor(() => expect(suggestCalls(fetchMock).length).toBe(1), { timeout: 3000 })
    const signal = suggestCalls(fetchMock)[0][1]?.signal
    signal?.addEventListener("abort", abort)

    await waitFor(() => expect(abort).toHaveBeenCalled(), { timeout: 3500 })
    expect(Date.now() - finished).toBeLessThan(3000)
    await waitFor(() => expect(screen.queryByText("La IA está leyendo tu nota…")).not.toBeInTheDocument())
    expect(screen.queryByRole("region", { name: "Sugerencia de la IA" })).not.toBeInTheDocument()
  })
})
