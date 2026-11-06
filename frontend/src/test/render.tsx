import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { MemoryRouter } from "react-router"

import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"

interface Options extends RenderOptions {
  /** Por defecto las pruebas corren con movimiento reducido para ser deterministas. */
  reducedMotion?: boolean
  route?: string
  theme?: "light" | "dark"
}

/** Renderiza con los mismos proveedores que la app (tema, movimiento y router). */
export function renderWithProviders(ui: ReactElement, { reducedMotion = true, route = "/", theme = "light", ...options }: Options = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider initialPreference={theme}>
        <MotionPreferenceProvider override={reducedMotion}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </MotionPreferenceProvider>
      </ThemeProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
