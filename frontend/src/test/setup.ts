import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.className = ""
  delete document.documentElement.dataset.motion
})

// jsdom no implementa matchMedia; por defecto simulamos «sin preferencias».
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// Recharts usa ResizeObserver para medir su contenedor.
if (!("ResizeObserver" in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", { value: ResizeObserverStub })
}

// El reproductor Lottie no aporta nada en jsdom: se sustituye por uno vacío.
vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: { loadAnimation: () => ({ goToAndStop: () => {}, destroy: () => {} }) },
}))
