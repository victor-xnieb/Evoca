import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider"

import { useReducedMotion } from "./use-reduced-motion"

function Probe() {
  return <span>{useReducedMotion() ? "reducido" : "completo"}</span>
}

function mockSystemPreference(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  )
}

describe("useReducedMotion", () => {
  afterEach(() => vi.restoreAllMocks())

  it("respeta la preferencia del sistema", () => {
    mockSystemPreference(true)
    render(
      <MotionPreferenceProvider>
        <Probe />
      </MotionPreferenceProvider>,
    )
    expect(screen.getByText("reducido")).toBeInTheDocument()
    expect(document.documentElement.dataset.motion).toBe("reduce")
  })

  it("anima con normalidad si el sistema no pide reducir", () => {
    mockSystemPreference(false)
    render(
      <MotionPreferenceProvider>
        <Probe />
      </MotionPreferenceProvider>,
    )
    expect(screen.getByText("completo")).toBeInTheDocument()
    expect(document.documentElement.dataset.motion).toBe("full")
  })

  it("permite forzar el modo (por ejemplo desde Storybook)", () => {
    mockSystemPreference(false)
    render(
      <MotionPreferenceProvider override>
        <Probe />
      </MotionPreferenceProvider>,
    )
    expect(screen.getByText("reducido")).toBeInTheDocument()
  })

  it("sin proveedor, lee directamente el sistema", () => {
    mockSystemPreference(true)
    render(<Probe />)
    expect(screen.getByText("reducido")).toBeInTheDocument()
  })
})
