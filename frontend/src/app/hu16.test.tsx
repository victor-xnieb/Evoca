import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Trace } from "@/lib/types"
import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const CATALOG = { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } }
const EMPTY_PAGE = { body: { count: 0, next: null, previous: null, results: [] } }

const now = new Date().toISOString()
const voiceTrace: Trace = {
  id: "trace-voz",
  sensory_type: "song",
  note: "",
  emotion: "nostalgia",
  mood_intensity: 4,
  tags: [],
  happened_at: null,
  voice_duration: 3,
  created_at: now,
  updated_at: now,
}

/** Micrófono y MediaRecorder de mentira: graban «audio» y respetan start/stop. */
class FakeRecorder {
  static isTypeSupported = (type: string) => type.startsWith("audio/webm")
  state: "inactive" | "recording" = "inactive"
  mimeType = "audio/webm;codecs=opus"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  stream: unknown
  options: MediaRecorderOptions | undefined
  static last: FakeRecorder | null = null
  constructor(stream: unknown, options?: MediaRecorderOptions) {
    this.stream = stream
    this.options = options
    FakeRecorder.last = this
  }
  start() {
    this.state = "recording"
  }
  stop() {
    this.state = "inactive"
    this.ondataavailable?.({ data: new Blob(["\x1a\x45\xdf\xa3audio"], { type: this.mimeType }) })
    this.onstop?.()
  }
}

const stopTrack = vi.fn()

function allowMicrophone(result: "allow" | "deny" | "missing" = "allow") {
  const getUserMedia = vi.fn(async () => {
    if (result === "deny") throw new DOMException("Permission denied", "NotAllowedError")
    if (result === "missing") throw new DOMException("Requested device not found", "NotFoundError")
    return { getTracks: () => [{ stop: stopTrack }] }
  })
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true })
  return getUserMedia
}

beforeEach(() => {
  vi.stubGlobal("MediaRecorder", FakeRecorder)
  URL.createObjectURL = vi.fn(() => "blob:nota-de-voz")
  URL.revokeObjectURL = vi.fn()
  stopTrack.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

function openNewTrace() {
  window.localStorage.setItem(`evoca.ejemplo-visto.${SAMPLE_USER.id}`, "1")
  return renderApp({ path: "/nueva-huella", user: SAMPLE_USER, locked: false })
}

const voiceSection = () => screen.findByRole("region", { name: "Nota de voz" }, { timeout: 5000 })

describe("HU16 · Escenario 1: grabar hasta 60 segundos y escucharla antes de guardar", () => {
  it("pide el micrófono para voz, sin recortar la voz baja, y graba con buena calidad", async () => {
    const getUserMedia = allowMicrophone()
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()
    const section = await voiceSection()

    await user.click(within(section).getByRole("button", { name: "Grabar nota de voz" }))
    await within(section).findByRole("status")

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
    })
    expect(FakeRecorder.last?.options).toEqual({ audioBitsPerSecond: 64_000, mimeType: "audio/webm;codecs=opus" })
  })

  it("graba, se detiene y deja escuchar la nota antes de guardar", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    allowMicrophone()
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    openNewTrace()
    const section = await voiceSection()

    await user.click(within(section).getByRole("button", { name: "Grabar nota de voz" }))
    expect(await within(section).findByRole("status")).toHaveTextContent("Grabando 0:00 de 1:00")
    await act(async () => {
      vi.advanceTimersByTime(3_000)
    })
    expect(within(section).getByRole("status")).toHaveTextContent("Grabando 0:03 de 1:00")
    await user.click(within(section).getByRole("button", { name: "Detener" }))

    const player = await within(section).findByLabelText("Escuchar tu nota de voz")
    expect(player.tagName).toBe("AUDIO")
    expect(player).toHaveAttribute("src", "blob:nota-de-voz")
    // El micrófono se suelta al terminar.
    expect(stopTrack).toHaveBeenCalled()
    expect(within(section).getByRole("button", { name: "Volver a grabar" })).toBeInTheDocument()

    await user.click(within(section).getByRole("button", { name: "Quitar la nota de voz" }))
    expect(within(section).getByRole("button", { name: "Grabar nota de voz" })).toBeInTheDocument()
  })

  it("se detiene sola al llegar a 60 segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    allowMicrophone()
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    openNewTrace()
    const section = await voiceSection()

    await user.click(within(section).getByRole("button", { name: "Grabar nota de voz" }))
    await within(section).findByRole("status")
    await act(async () => {
      vi.advanceTimersByTime(61_000)
    })

    expect(await within(section).findByLabelText("Escuchar tu nota de voz")).toBeInTheDocument()
    expect(within(section).getByText(/Tu nota de voz \(1:00\)/)).toBeInTheDocument()
  })
})

describe("HU16 · Escenario 2: la nota de voz se guarda como huella con tipo, emoción e intensidad", () => {
  it("guarda sin nota escrita y envía la grabación con la huella", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    allowMicrophone()
    let sent: FormData | null = null
    let created = false
    mockApi({
      "GET traces/catalog/": CATALOG,
      "GET traces/": () => (created ? { body: { count: 1, next: null, previous: null, results: [voiceTrace] } } : EMPTY_PAGE),
    })
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST" && String(input).includes("traces/with-voice/")) {
        sent = init.body as FormData
        created = true
        return new Response(JSON.stringify(voiceTrace), { status: 201, headers: { "content-type": "application/json" } })
      }
      return original(input, init)
    }) as typeof fetch
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Canción" }))
    const section = await voiceSection()
    await user.click(within(section).getByRole("button", { name: "Grabar nota de voz" }))
    await within(section).findByRole("status")
    await act(async () => {
      vi.advanceTimersByTime(3_000)
    })
    await user.click(within(section).getByRole("button", { name: "Detener" }))
    await within(section).findByLabelText("Escuchar tu nota de voz")
    await user.click(screen.getByRole("radio", { name: "Nostalgia" }))
    await user.click(screen.getByRole("radio", { name: /4 de 5/ }))
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    expect(await screen.findByText("Guardaste tu huella.")).toBeInTheDocument()
    expect(JSON.parse(String(sent!.get("data")))).toEqual({ sensory_type: "song", note: "", emotion: "nostalgia", mood_intensity: 4 })
    expect((sent!.get("audio") as File).type).toBe("audio/webm;codecs=opus")
    expect(Number(sent!.get("duration"))).toBeCloseTo(3, 0)
    const list = screen.getByRole("list", { name: "Huellas recientes" })
    expect(within(list).getByText("Nota de voz")).toBeInTheDocument()
    expect(within(list).getByText("Nota de voz · 0:03")).toBeInTheDocument()
  })

  it("sin nota escrita ni de voz, pide una de las dos", async () => {
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()

    await user.click(await screen.findByRole("radio", { name: "Canción" }))
    await user.click(screen.getByRole("radio", { name: "Nostalgia" }))
    await user.click(screen.getByRole("radio", { name: /4 de 5/ }))
    await user.click(screen.getByRole("button", { name: "Guardar huella" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Escribe una nota corta sobre el recuerdo o graba una nota de voz.")
  })

  it("en el detalle de la huella se puede escuchar", async () => {
    mockApi({ "GET traces/catalog/": CATALOG, "GET traces/trace-voz/": { body: voiceTrace } })
    const original = globalThis.fetch
    const audioFetch = vi.fn()
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("traces/trace-voz/voice/")) {
        audioFetch(init)
        return new Response(new Blob(["audio"], { type: "audio/webm" }), { status: 200 })
      }
      return original(input, init)
    }) as typeof fetch
    renderApp({ path: "/mis-huellas/trace-voz", user: SAMPLE_USER, locked: false })

    const player = await screen.findByLabelText("Escuchar la nota de voz", {}, { timeout: 5000 })
    expect(player).toHaveAttribute("src", "blob:nota-de-voz")
    // El audio se pide por la API (con la sesión, si la hay), no es un enlace público.
    expect(audioFetch).toHaveBeenCalledTimes(1)
  })
})

describe("HU16 · Escenario 3: sin permiso del micrófono explica por qué y deja escribir", () => {
  it("explica para qué se necesita el micrófono y lleva a escribir la nota", async () => {
    allowMicrophone("deny")
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()
    const section = await voiceSection()

    await user.click(within(section).getByRole("button", { name: "Grabar nota de voz" }))

    const alert = await within(section).findByRole("alert")
    expect(alert).toHaveTextContent("Evoca necesita permiso para usar tu micrófono")
    expect(alert).toHaveTextContent("o escribir la nota")
    await user.click(within(alert).getByRole("button", { name: "Escribir la nota" }))
    await waitFor(() => expect(screen.getByLabelText("Escribe una nota corta")).toHaveFocus())
  })

  it("sin micrófono o sin soporte, lo dice y la nota escrita sigue disponible", async () => {
    allowMicrophone("missing")
    mockApi({ "GET traces/catalog/": CATALOG })
    const user = userEvent.setup()
    openNewTrace()
    const section = await voiceSection()

    await user.click(within(section).getByRole("button", { name: "Grabar nota de voz" }))

    expect(await within(section).findByText(/No encontramos un micrófono/)).toBeInTheDocument()
    expect(screen.getByLabelText("Escribe una nota corta")).toBeEnabled()
  })

  it("en un navegador sin grabación lo avisa", async () => {
    vi.stubGlobal("MediaRecorder", undefined)
    mockApi({ "GET traces/catalog/": CATALOG })
    openNewTrace()
    expect(within(await voiceSection()).getByText("Este navegador no permite grabar audio. Puedes escribir la nota.")).toBeInTheDocument()
  })
})
