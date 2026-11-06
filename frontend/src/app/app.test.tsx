import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"

import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"

import { routes } from "./routes"

function renderApp(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <ThemeProvider initialPreference="light">
      <MotionPreferenceProvider override>
        <RouterProvider router={router} />
      </MotionPreferenceProvider>
    </ThemeProvider>,
  )
  return router
}

describe("App", () => {
  it("muestra la pantalla de inicio con su invitación a registrar", () => {
    renderApp()
    expect(screen.getByRole("heading", { level: 1, name: "evoca" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar mi primera huella" })).toHaveAttribute("href", "/nueva-huella")
  })

  it("tiene la navegación inferior con las 5 secciones acordadas", () => {
    renderApp()
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    const links = within(nav).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      "Inicio",
      "Nueva huella",
      "Mis huellas",
      "Ánimo",
      "Ajustes",
    ])
    expect(within(nav).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page")
  })

  it("navega entre secciones", async () => {
    const router = renderApp()
    await userEvent.click(screen.getByRole("link", { name: "Ajustes" }))
    expect(router.state.location.pathname).toBe("/ajustes")
    expect(await screen.findByRole("heading", { name: "Ajustes" })).toBeInTheDocument()
  })

  it("cambia a modo oscuro desde el interruptor", async () => {
    renderApp()
    const toggle = screen.getByRole("switch", { name: "Modo oscuro" })
    expect(toggle).toHaveAttribute("aria-checked", "false")

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-checked", "true")
    expect(document.documentElement).toHaveClass("dark")
    expect(window.localStorage.getItem("evoca.theme")).toBe("dark")
  })

  it("responde con calma a rutas que no existen", () => {
    renderApp("/no-existe")
    expect(screen.getByRole("heading", { name: "Esta página no existe" })).toBeInTheDocument()
  })
})
