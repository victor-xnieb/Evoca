import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

import { resetCatalogCache } from "@/hooks/use-catalog"
import { resetSupportContentCache } from "@/hooks/use-support-content"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  resetCatalogCache()
  resetSupportContentCache()
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

// jsdom no reproduce video: play() y pause() se simulan para poder verificar las llamadas.
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn(() => Promise.resolve()),
})
Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: vi.fn() })

// jsdom no tiene IntersectionObserver: todo se considera visible.
if (!("IntersectionObserver" in window)) {
  class IntersectionObserverStub {
    callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }
    observe(target: Element) {
      this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as never)
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: IntersectionObserverStub })
}

// El reproductor Lottie no aporta nada en jsdom: se sustituye por uno vacío.
vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: { loadAnimation: () => ({ goToAndStop: () => {}, destroy: () => {} }) },
}))
