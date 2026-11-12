import type { Page, Route } from "@playwright/test"

export const API = "http://127.0.0.1:8999/api/v1/"

export const DEMO_USER = {
  id: "8b3f2c1e-0000-4000-8000-000000000001",
  email: "ana@example.com",
  first_name: "Ana",
  last_name: "",
  date_of_birth: "1995-04-12",
  date_joined: "2026-11-01T10:00:00Z",
  has_pin: true,
}

export const CATALOG = {
  sensory_types: [
    { value: "aroma", label: "Aroma" },
    { value: "color", label: "Color" },
    { value: "song", label: "Canción" },
    { value: "flavor", label: "Sabor" },
    { value: "texture", label: "Textura" },
    { value: "place", label: "Lugar" },
  ],
  emotions: [
    { value: "alegria", label: "Alegría" },
    { value: "calma", label: "Calma" },
    { value: "gratitud", label: "Gratitud" },
    { value: "nostalgia", label: "Nostalgia" },
    { value: "tristeza", label: "Tristeza" },
    { value: "ansiedad", label: "Ansiedad" },
    { value: "enojo", label: "Enojo" },
    { value: "miedo", label: "Miedo" },
  ],
}

type Reply = { status?: number; body?: unknown }
export type Handlers = Record<string, Reply | ((url: URL) => Reply)>

/**
 * Simula la API: cada clave es «MÉTODO ruta» («GET memories/»). Lo que no está simulado
 * responde 404, como un recurso que no existe, para que la app siga su camino de error.
 */
export async function mockApi(page: Page, handlers: Handlers) {
  const base: Handlers = {
    "GET auth/me/": { body: DEMO_USER },
    "GET auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } },
    "POST auth/pin/verify/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5, verified: true } },
    "GET traces/catalog/": { body: CATALOG },
    "GET traces/": { body: { count: 0, next: null, previous: null, results: [] } },
  }
  const all = { ...base, ...handlers }
  await page.route(`${API}**`, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const key = `${request.method()} ${url.pathname.replace("/api/v1/", "")}`
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    const handler = all[key]
    const reply = typeof handler === "function" ? handler(url) : (handler ?? { status: 404, body: { detail: "No encontrado." } })
    await route.fulfill({
      status: reply.status ?? 200,
      headers: { ...cors, "content-type": "application/json" },
      body: JSON.stringify(reply.body ?? {}),
    })
  })
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, accept",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
}

/** Entra con una sesión guardada y desbloquea con el PIN, como al abrir la PWA. */
export async function signInAndUnlock(page: Page, path = "/") {
  await page.addInitScript(() => window.localStorage.setItem("evoca.token", "token-de-prueba"))
  await page.goto(path)
  await page.getByRole("heading", { name: `Hola, ${DEMO_USER.first_name}` }).waitFor()
  for (const digit of "2468") await page.getByRole("button", { name: digit, exact: true }).click()
  const nav = page.getByRole("navigation", { name: "Navegación principal" })
  const later = page.getByRole("button", { name: "Ahora no" })
  await nav.or(later).first().waitFor()
  if (await later.isVisible()) await later.click()
  await nav.waitFor()
}
