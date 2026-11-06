import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FINE_POINTER_QUERY } from "@/hooks/use-fine-pointer"
import { renderWithProviders } from "@/test/render"

import { EmotionOrb } from "./EmotionOrb"
import { GlassCard } from "./GlassCard"
import { InteractiveCursor } from "./InteractiveCursor"

/** Simula un dispositivo con mouse (true) o táctil (false). */
function mockPointer(fine: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: query === FINE_POINTER_QUERY && fine,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/** Evento de mouse con pointerType (jsdom no siempre tiene PointerEvent). */
function pointer(type: string, target: Element, init: { x?: number; y?: number; pointerType?: string } = {}) {
  const event = new MouseEvent(type, { bubbles: true, clientX: init.x ?? 20, clientY: init.y ?? 20 })
  Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" })
  act(() => {
    target.dispatchEvent(event)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("GlassCard", () => {
  it("renderiza su contenido como contenedor", () => {
    renderWithProviders(
      <GlassCard as="section" aria-label="Resumen">
        <p>Contenido</p>
      </GlassCard>,
    )
    expect(screen.getByRole("region", { name: "Resumen" })).toHaveTextContent("Contenido")
  })

  it("si es clicable es un botón accesible por teclado", async () => {
    const onClick = vi.fn()
    renderWithProviders(<GlassCard onClick={onClick}>Ver detalle</GlassCard>)
    const button = screen.getByRole("button", { name: "Ver detalle" })
    await userEvent.tab()
    expect(button).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("con `to` es un enlace", () => {
    renderWithProviders(<GlassCard to="/animo">Ánimo</GlassCard>)
    expect(screen.getByRole("link", { name: "Ánimo" })).toHaveAttribute("href", "/animo")
  })

  it("con mouse activa la inclinación, el foco de luz y el paralaje", () => {
    mockPointer(true)
    renderWithProviders(<GlassCard onClick={() => {}}>Tarjeta</GlassCard>, { reducedMotion: false })
    const card = screen.getByRole("button")
    expect(card).toHaveAttribute("data-fx", "on")
    pointer("pointermove", card, { x: 10, y: 10 })
    expect(card.style.getPropertyValue("--mx")).not.toBe("")
    expect(card.style.getPropertyValue("--px")).not.toBe("")
  })

  it("con movimiento reducido no aplica inclinación ni paralaje", () => {
    mockPointer(true)
    renderWithProviders(<GlassCard onClick={() => {}}>Tarjeta</GlassCard>, { reducedMotion: true })
    const card = screen.getByRole("button")
    expect(card).toHaveAttribute("data-fx", "off")
    pointer("pointermove", card, { x: 10, y: 10 })
    expect(card.style.getPropertyValue("--px")).toBe("")
    expect(card.style.transform).not.toMatch(/rotate/)
  })

  it("en pantallas táctiles no hay inclinación y el toque deja un destello", () => {
    mockPointer(false)
    renderWithProviders(<GlassCard onClick={() => {}}>Tarjeta</GlassCard>, { reducedMotion: false })
    const card = screen.getByRole("button")
    expect(card).toHaveAttribute("data-fx", "off")
    fireEvent.pointerDown(card, { pointerType: "touch" })
    expect(card).toHaveAttribute("data-flash")
  })
})

describe("InteractiveCursor", () => {
  it("no se monta con pantalla táctil", () => {
    mockPointer(false)
    renderWithProviders(<InteractiveCursor />, { reducedMotion: false })
    expect(screen.queryByTestId("cursor-ring")).not.toBeInTheDocument()
  })

  it("no se monta con movimiento reducido", () => {
    mockPointer(true)
    renderWithProviders(<InteractiveCursor />, { reducedMotion: true })
    expect(screen.queryByTestId("cursor-ring")).not.toBeInTheDocument()
  })

  it("cambia de estado sobre una GlassCard y sobre un elemento con data-cursor-label", () => {
    mockPointer(true)
    renderWithProviders(
      <>
        <InteractiveCursor />
        <GlassCard accent="calma">
          <p>Dentro de la tarjeta</p>
        </GlassCard>
        <a href="/mis-huellas" data-cursor-label="Ver">
          Mis huellas
        </a>
        <p>Texto suelto</p>
      </>,
      { reducedMotion: false },
    )
    const ring = screen.getByTestId("cursor-ring")
    expect(ring).toHaveAttribute("data-state", "hidden")

    pointer("pointermove", screen.getByText("Dentro de la tarjeta"))
    expect(ring).toHaveAttribute("data-state", "card")

    pointer("pointermove", screen.getByRole("link", { name: "Mis huellas" }))
    expect(ring).toHaveAttribute("data-state", "link")
    expect(ring).toHaveTextContent("Ver")

    pointer("pointermove", screen.getByText("Texto suelto"))
    expect(ring).toHaveAttribute("data-state", "text")

    pointer("pointerdown", screen.getByText("Texto suelto"))
    expect(ring).toHaveAttribute("data-pressed")
  })
})

describe("EmotionOrb animada", () => {
  it("aplica la flotación", async () => {
    renderWithProviders(<EmotionOrb emotion="calma" animated />, { reducedMotion: false })
    const orb = screen.getByTestId("emotion-orb")
    expect(orb).toHaveAttribute("data-floating", "true")
    const floater = orb.firstElementChild as HTMLElement
    await waitFor(() => expect(floater.style.transform).toMatch(/translate|rotate|scale/))
  })

  it("con movimiento reducido queda quieta", async () => {
    renderWithProviders(<EmotionOrb emotion="calma" animated />, { reducedMotion: true })
    const orb = screen.getByTestId("emotion-orb")
    expect(orb).not.toHaveAttribute("data-floating")
    expect(orb).not.toHaveAttribute("data-cursor")
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)))
    expect((orb.firstElementChild as HTMLElement).style.transform).toBe("")
  })
})
