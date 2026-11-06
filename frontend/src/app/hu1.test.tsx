import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { calculateAge, isAdult } from "@/lib/age"
import { tokenStore } from "@/lib/api"
import { ACCOUNT_DELETED_NOTICE, HEALTH_DATA_MESSAGE, MINOR_MESSAGE } from "@/lib/messages"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

function birthDateYearsAgo(years: number, extraDays = 0) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  date.setDate(date.getDate() + extraDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

async function fillRegistration(user: ReturnType<typeof userEvent.setup>, { birth = "1995-04-12", health = true } = {}) {
  await screen.findByRole("heading", { name: "Crea tu cuenta" })
  await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com")
  await user.type(screen.getByLabelText("Contraseña"), "UnaClaveSegura!2026")
  await user.type(screen.getByLabelText("Fecha de nacimiento"), birth)
  if (health) await user.click(screen.getByRole("checkbox", { name: /datos sensibles/ }))
  await user.click(screen.getByRole("checkbox", { name: /términos de uso/ }))
  await user.click(screen.getByRole("checkbox", { name: /política de privacidad/ }))
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state })
  Object.defineProperty(document, "hidden", { configurable: true, value: state === "hidden" })
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

describe("HU1 · Escenario 1: registro de personas adultas con autorización expresa", () => {
  it("calcula la mayoría de edad igual que el servidor: 18 años cumplidos hoy sí, mañana no", () => {
    const today = new Date(2026, 10, 5)
    expect(isAdult("2008-11-05", today)).toBe(true)
    expect(isAdult("2008-11-06", today)).toBe(false)
    expect(calculateAge("2008-11-06", today)).toBe(17)
  })

  it("no crea la cuenta de una persona menor de 18 años y explica el motivo", async () => {
    const fetchMock = mockApi({})
    const user = userEvent.setup()
    renderApp({ path: "/registro", user: null })

    await fillRegistration(user, { birth: birthDateYearsAgo(18, 1) })
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }))

    expect(within(screen.getByRole("alert")).getByText(MINOR_MESSAGE)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("no crea la cuenta sin la autorización de datos sensibles y explica el motivo", async () => {
    const fetchMock = mockApi({})
    const user = userEvent.setup()
    renderApp({ path: "/registro", user: null })

    await fillRegistration(user, { health: false })
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }))

    expect(within(screen.getByRole("alert")).getByText(HEALTH_DATA_MESSAGE)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("muestra el motivo que da el servidor si rechaza el registro", async () => {
    mockApi({
      "POST auth/register/": { status: 400, body: { email: ["Ya existe Usuario con este correo electrónico."] } },
    })
    const user = userEvent.setup()
    renderApp({ path: "/registro", user: null })

    await fillRegistration(user)
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }))

    expect(await screen.findAllByText("Ya existe Usuario con este correo electrónico.")).not.toHaveLength(0)
  })

  it("con 18 años y la autorización, crea la cuenta, envía los consentimientos y pide crear el PIN", async () => {
    const fetchMock = mockApi({
      "POST auth/register/": { status: 201, body: { token: "tok-123", user: { ...SAMPLE_USER, has_pin: false } } },
    })
    const user = userEvent.setup()
    renderApp({ path: "/registro", user: null })

    await fillRegistration(user, { birth: birthDateYearsAgo(18) })
    await user.click(screen.getByRole("button", { name: "Crear mi cuenta" }))

    expect(await screen.findByRole("heading", { name: "Crea tu PIN" })).toBeInTheDocument()
    expect(sentBody(fetchMock, "POST auth/register/")).toMatchObject({
      accepted_health_data: true,
      accepted_terms: true,
      accepted_privacy: true,
    })
    expect(tokenStore.get()).toBe("tok-123")
  })

  it("crea el PIN de 4 dígitos tras confirmarlo dos veces", async () => {
    const fetchMock = mockApi({ "PUT auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } } })
    const user = userEvent.setup()
    renderApp({ path: "/crear-pin", user: { ...SAMPLE_USER, has_pin: false } })

    await screen.findByRole("heading", { name: "Crea tu PIN" })
    await user.keyboard("1357")
    await user.keyboard("2468")
    expect(await screen.findByText("Los PIN no coinciden. Vuelve a crearlo.")).toBeInTheDocument()

    await user.keyboard("1357")
    await user.keyboard("1357")

    await waitFor(() => expect(sentBody(fetchMock, "PUT auth/pin/")).toEqual({ pin: "1357" }))
    expect(await screen.findByRole("heading", { level: 1, name: "evoca" })).toBeInTheDocument()
  })

  it("sin sesión, las pantallas de la app llevan a entrar", () => {
    renderApp({ path: "/", user: null })
    expect(screen.getByRole("heading", { name: "Entra a tu cuenta" })).toBeInTheDocument()
  })
})

describe("HU1 · Escenario 2: PIN al abrir o volver a la app y bloqueo de 5 minutos", () => {
  const pinOk = { body: { verified: true, has_pin: true, locked_until: null, remaining_attempts: 5 } }

  it("al abrir la app con una sesión guardada pide el PIN antes de mostrar nada", async () => {
    tokenStore.set("tok-123")
    mockApi({
      "GET auth/me/": { body: SAMPLE_USER },
      "GET auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } },
    })
    renderApp({ path: "/" })

    expect(await screen.findByRole("heading", { name: "Hola, Ana" })).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument()
  })

  it("con el PIN correcto se desbloquea", async () => {
    const fetchMock = mockApi({
      "GET auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } },
      "POST auth/pin/verify/": pinOk,
    })
    const user = userEvent.setup()
    renderApp({ path: "/", user: SAMPLE_USER, locked: true })

    await user.keyboard("2468")

    expect(await screen.findByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument()
    expect(sentBody(fetchMock, "POST auth/pin/verify/")).toEqual({ pin: "2468" })
  })

  it("vuelve a pedir el PIN al regresar desde segundo plano", async () => {
    mockApi({ "GET auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } } })
    renderApp({ path: "/", user: SAMPLE_USER, locked: false })
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument()

    setVisibility("hidden")
    setVisibility("visible")

    expect(await screen.findByRole("heading", { name: "Hola, Ana" })).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument()
  })

  it("cuenta los intentos y al 5.º fallo bloquea el acceso 5 minutos con cuenta regresiva", async () => {
    let attempts = 0
    mockApi({
      "GET auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } },
      "POST auth/pin/verify/": () => {
        attempts += 1
        if (attempts < 5) {
          const remaining = 5 - attempts
          return {
            status: 400,
            body: {
              detail: remaining === 1 ? "PIN incorrecto. Te queda 1 intento." : `PIN incorrecto. Te quedan ${remaining} intentos.`,
              remaining_attempts: remaining,
            },
          }
        }
        return {
          status: 423,
          body: {
            detail: "Por tu seguridad bloqueamos el acceso durante 5 minutos.",
            locked_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            remaining_attempts: 0,
          },
        }
      },
    })
    const user = userEvent.setup()
    renderApp({ path: "/", user: SAMPLE_USER, locked: true })

    for (const remaining of [4, 3, 2]) {
      await user.keyboard("0000")
      expect(await screen.findByText(`PIN incorrecto. Te quedan ${remaining} intentos.`)).toBeInTheDocument()
    }
    await user.keyboard("0000")
    expect(await screen.findByText("PIN incorrecto. Te queda 1 intento.")).toBeInTheDocument()

    await user.keyboard("0000")

    expect(await screen.findByText("5:00")).toBeInTheDocument()
    expect(screen.getByText(/Por tu seguridad, espera/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "1" })).toBeDisabled()
    expect(attempts).toBe(5)
  })

  it("respeta un bloqueo vigente aunque se recargue la app", async () => {
    mockApi({
      "GET auth/pin/": {
        body: { has_pin: true, locked_until: new Date(Date.now() + 3 * 60 * 1000).toISOString(), remaining_attempts: 0 },
      },
    })
    renderApp({ path: "/", user: SAMPLE_USER, locked: true })

    expect(await screen.findByText("3:00")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "0" })).toBeDisabled()
  })

  it("si olvidó el PIN, cierra la sesión y lo lleva a entrar con su contraseña", async () => {
    mockApi({
      "GET auth/pin/": { body: { has_pin: true, locked_until: null, remaining_attempts: 5 } },
      "POST auth/logout/": { status: 204 },
    })
    tokenStore.set("tok-123")
    const user = userEvent.setup()
    renderApp({ path: "/", user: SAMPLE_USER, locked: true })

    await user.click(screen.getByRole("button", { name: /Olvidaste tu PIN/ }))

    expect(await screen.findByRole("heading", { name: "Entra a tu cuenta" })).toBeInTheDocument()
    expect(tokenStore.get()).toBeNull()
  })
})

describe("HU1 · Escenario 3: exportar mis datos o eliminar mi cuenta", () => {
  const consents = {
    body: [
      { consent_type: "health_data", document_version: "draft-v1", accepted_at: "2026-11-01T15:00:00Z", revoked_at: null },
    ],
  }

  it("muestra cuándo y con qué versión autorizó el tratamiento de datos sensibles", async () => {
    mockApi({ "GET auth/consents/": consents })
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    expect(await screen.findByText(/Autorizaste el tratamiento de tus datos sensibles el 1 de noviembre de 2026/)).toHaveTextContent(
      "versión draft-v1",
    )
  })

  it("exportar descarga un archivo con mis datos", async () => {
    const exported = { account: { email: SAMPLE_USER.email }, traces: [] }
    const fetchMock = mockApi({ "GET auth/consents/": consents, "GET auth/export/": { body: exported } })
    const createObjectURL = vi.fn(() => "blob:evoca")
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("button", { name: "Exportar mis datos" }))

    expect(await screen.findByText(/Descargamos tus datos en el archivo evoca-mis-datos-\d{4}-\d{2}-\d{2}\.json/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("auth/export/"))).toBe(true)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const anchor = click.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.download).toMatch(/^evoca-mis-datos-.*\.json$/)
    click.mockRestore()
  })

  it("eliminar pide confirmación con la contraseña, borra la cuenta y cierra la sesión", async () => {
    const fetchMock = mockApi({ "GET auth/consents/": consents, "DELETE auth/account/": { status: 204 } })
    tokenStore.set("tok-123")
    const user = userEvent.setup()
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("button", { name: "Eliminar mi cuenta" }))
    const dialog = await screen.findByRole("dialog", { name: "¿Eliminar tu cuenta?" })
    await user.click(within(dialog).getByRole("button", { name: "Eliminar definitivamente" }))
    expect(within(dialog).getByText("Escribe tu contraseña para confirmar.", { selector: "p" })).toBeInTheDocument()
    expect(sentBody(fetchMock, "DELETE auth/account/")).toBeUndefined()

    await user.type(within(dialog).getByLabelText("Escribe tu contraseña para confirmar"), "UnaClaveSegura!2026")
    await user.click(within(dialog).getByRole("button", { name: "Eliminar definitivamente" }))

    expect(await screen.findByText(ACCOUNT_DELETED_NOTICE)).toBeInTheDocument()
    expect(sentBody(fetchMock, "DELETE auth/account/")).toEqual({ password: "UnaClaveSegura!2026" })
    expect(tokenStore.get()).toBeNull()
  })
})
