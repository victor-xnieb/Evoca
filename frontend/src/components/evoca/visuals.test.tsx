import { act, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EMOTION_SLUGS } from "@/lib/emotions"
import { renderWithProviders } from "@/test/render"

import { AnimatedBackground } from "./AnimatedBackground"
import { EmotionOrb } from "./EmotionOrb"

const ALT: Record<string, string> = {
  alegria: "Esfera de alegría",
  calma: "Esfera de calma",
  gratitud: "Esfera de gratitud",
  nostalgia: "Esfera de nostalgia",
  tristeza: "Esfera de tristeza",
  ansiedad: "Esfera de ansiedad",
  enojo: "Esfera de enojo",
  miedo: "Esfera de miedo",
}

/** Simula la orientación de la pantalla (el resto de consultas responde «no»). */
function mockOrientation(orientation: "portrait" | "landscape") {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: query === "(orientation: portrait)" && orientation === "portrait",
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function mockSaveData(saveData: boolean) {
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: { saveData, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  })
}

/** El video se monta cuando el navegador está ocioso (en jsdom, tras 300 ms). */
const afterIdle = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)))

const background = () => screen.getByTestId("animated-background")
const videoSources = () =>
  Array.from(background().querySelectorAll("video source")).map((source) => source.getAttribute("src"))

afterEach(() => {
  vi.restoreAllMocks()
  // @ts-expect-error: se limpia la simulación de la Network Information API.
  delete navigator.connection
})

describe("EmotionOrb", () => {
  it.each(EMOTION_SLUGS)("muestra la imagen de %s con su texto alternativo", (emotion) => {
    renderWithProviders(<EmotionOrb emotion={emotion} size="lg" />)
    const image = screen.getByRole("img", { name: ALT[emotion] })
    expect(image.getAttribute("src")).toContain(`orb-${emotion}.webp`)
    expect(image).toHaveAttribute("width", "160")
    expect(image).toHaveAttribute("height", "160")
  })

  it("usa la versión pequeña (128 px) en tamaños pequeños", () => {
    renderWithProviders(<EmotionOrb emotion="calma" size="sm" />)
    expect(screen.getByRole("img", { name: "Esfera de calma" }).getAttribute("src")).toContain("orb-calma-sm.webp")
  })

  it("como decoración queda oculta a los lectores de pantalla", () => {
    renderWithProviders(<EmotionOrb emotion="enojo" decorative />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByTestId("emotion-orb").querySelector("img")).toHaveAttribute("alt", "")
  })

  it("carga diferida salvo que se marque como prioritaria", () => {
    const { rerender } = renderWithProviders(<EmotionOrb emotion="miedo" />)
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy")
    rerender(<EmotionOrb emotion="miedo" priority />)
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager")
  })
})

describe("AnimatedBackground", () => {
  it("monta el video claro vertical cuando el navegador queda ocioso", async () => {
    mockOrientation("portrait")
    renderWithProviders(<AnimatedBackground />, { reducedMotion: false })
    // Primero solo la imagen fija: el video no compite con el primer pintado.
    expect(background().querySelector("video")).toBeNull()
    expect(background().querySelector("img")?.getAttribute("src")).toContain("bg-claro-vertical-poster.webp")
    await waitFor(() => expect(videoSources()).toEqual(["/media/bg-claro-vertical.mp4"]))
    const video = background().querySelector("video")!
    expect(video).toHaveAttribute("poster", "/media/bg-claro-vertical-poster.webp")
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute("playsinline")
    expect(video).toHaveAttribute("preload", "metadata")
    expect(background()).toHaveAttribute("aria-hidden", "true")
  })

  it("elige el video horizontal en pantallas horizontales", async () => {
    mockOrientation("landscape")
    renderWithProviders(<AnimatedBackground />, { reducedMotion: false })
    await waitFor(() => expect(videoSources()).toEqual(["/media/bg-claro-horizontal.mp4"]))
  })

  it("elige el video oscuro con el tema oscuro", async () => {
    mockOrientation("portrait")
    renderWithProviders(<AnimatedBackground />, { reducedMotion: false, theme: "dark" })
    await waitFor(() => expect(videoSources()).toEqual(["/media/bg-oscuro-vertical.mp4"]))
  })

  it("con movimiento reducido no monta video y usa el fondo estático claro", async () => {
    mockOrientation("portrait")
    renderWithProviders(<AnimatedBackground />, { reducedMotion: true })
    await afterIdle()
    expect(background().querySelector("video")).toBeNull()
    expect(background().querySelector("img")?.getAttribute("src")).toContain("bg-claro-estatico.webp")
  })

  it("con movimiento reducido en oscuro usa el poster del video oscuro", async () => {
    mockOrientation("landscape")
    renderWithProviders(<AnimatedBackground />, { reducedMotion: true, theme: "dark" })
    await afterIdle()
    expect(background().querySelector("video")).toBeNull()
    expect(background().querySelector("img")?.getAttribute("src")).toContain("bg-oscuro-horizontal-poster.webp")
  })

  it("con ahorro de datos no monta video", async () => {
    mockOrientation("portrait")
    mockSaveData(true)
    renderWithProviders(<AnimatedBackground />, { reducedMotion: false })
    await afterIdle()
    expect(background().querySelector("video")).toBeNull()
    expect(background().querySelector("img")?.getAttribute("src")).toContain("bg-claro-estatico.webp")
  })

  it('con variant="static" nunca monta video', async () => {
    mockOrientation("portrait")
    renderWithProviders(<AnimatedBackground variant="static" />, { reducedMotion: false })
    await afterIdle()
    expect(background().querySelector("video")).toBeNull()
    expect(background().querySelector("img")?.getAttribute("src")).toContain("bg-claro-estatico.webp")
  })

  it("pausa el video con la pestaña oculta y lo reanuda al volver", async () => {
    mockOrientation("portrait")
    renderWithProviders(<AnimatedBackground />, { reducedMotion: false })
    await waitFor(() => expect(background().querySelector("video")).not.toBeNull())
    const video = background().querySelector("video")!
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true)
    const pause = vi.spyOn(video, "pause")
    const play = vi.spyOn(video, "play")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(pause).toHaveBeenCalled()
    hidden.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(play).toHaveBeenCalled()
  })
})
