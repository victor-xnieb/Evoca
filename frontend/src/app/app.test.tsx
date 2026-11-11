import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { mockApi, SAMPLE_USER } from "@/test/api-mock"
import { renderApp as renderWithSession } from "@/test/render-app"

/** La app con una sesión abierta y ya desbloqueada. */
const renderApp = (path = "/") => renderWithSession({ path, user: SAMPLE_USER, locked: false })

beforeEach(() => {
  mockApi({
    "GET auth/consents/": { body: [] },
    "GET traces/": { body: { count: 0, next: null, previous: null, results: [] } },
    "GET traces/catalog/": { body: { sensory_types: [], emotions: [] } },
  })
})

describe("App", () => {
  it("muestra la pantalla de inicio con su invitación a registrar", async () => {
    renderApp()
    expect(screen.getByRole("heading", { level: 1, name: "evoca" })).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: "Registrar mi primera huella" })).toHaveAttribute("href", "/nueva-huella")
  })

  it("tiene la navegación inferior con las 6 secciones acordadas (Recuerdos llega con HU10)", () => {
    renderApp()
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    const links = within(nav).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      "Inicio",
      "Nueva huella",
      "Mis huellas",
      "Recuerdos",
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
