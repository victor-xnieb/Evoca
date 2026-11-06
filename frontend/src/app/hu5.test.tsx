import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { msUntil, msUntilNextCheck, msUntilNextHour, REMINDER_TEXT, type ReminderStatus } from "@/lib/reminder"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

/** Notificación del navegador simulada: guarda las que se crean. */
class FakeNotification {
  static permission: NotificationPermission = "granted"
  static requestPermission = vi.fn(async () => {
    FakeNotification.permission = "granted"
    return "granted" as NotificationPermission
  })
  static created: FakeNotification[] = []
  onclick: (() => void) | null = null
  title: string
  options: NotificationOptions
  constructor(title: string, options: NotificationOptions) {
    this.title = title
    this.options = options
    FakeNotification.created.push(this)
  }
  close() {}
}

function useFakeNotifications(permission: NotificationPermission = "granted") {
  FakeNotification.permission = permission
  FakeNotification.created = []
  FakeNotification.requestPermission.mockClear()
  vi.stubGlobal("Notification", FakeNotification)
}

const HOME = {
  "GET traces/": { body: { count: 0, next: null, previous: null, results: [] } },
  "GET traces/catalog/": { body: { sensory_types: [], emotions: [] } },
}

function status(overrides: Partial<ReminderStatus>): { body: ReminderStatus } {
  return {
    body: { due: false, reason: "early", enabled: true, time: "20:00", frequency: "daily", last_notified_on: null, ...overrides },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe("HU5 · Escenario 1: activar el recordatorio, elegir la hora y desactivarlo", () => {
  it("al activarlo pide permiso de notificaciones y guarda la hora; luego se puede desactivar", async () => {
    useFakeNotifications("default")
    let saved = { enabled: false, time: "20:00", frequency: "daily", last_notified_on: null }
    const fetchMock = mockApi({
      "GET auth/consents/": { body: [] },
      "GET auth/reminder/": () => ({ body: saved }),
      "PUT auth/reminder/": ({ body }) => {
        saved = { ...saved, ...(body as object) }
        return { body: saved }
      },
      "GET auth/reminder/status/": status({ enabled: false, reason: "disabled" }),
    })
    const user = userEvent.setup()
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    const toggle = await screen.findByRole("switch", { name: "Recordarme registrar mi huella" }, { timeout: 5000 })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    await user.click(toggle)

    expect(FakeNotification.requestPermission).toHaveBeenCalled()
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))
    expect(sentBody(fetchMock, "PUT auth/reminder/")).toEqual({ enabled: true, time: "20:00" })
    expect(screen.getByText("Te recordaremos a las 20:00 si ese día no has registrado una huella.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "21:30" } })
    expect(await screen.findByText("Te recordaremos a las 21:30 si ese día no has registrado una huella.")).toBeInTheDocument()
    expect(saved.time).toBe("21:30")

    await user.click(toggle)
    expect(await screen.findByText("Desactivaste el recordatorio diario.")).toBeInTheDocument()
    expect(saved).toMatchObject({ enabled: false, time: "21:30" })
  })

  it("también puede avisar cada hora en vez de a una hora fija", async () => {
    useFakeNotifications()
    let saved = { enabled: true, time: "20:00", frequency: "daily", last_notified_on: null }
    const fetchMock = mockApi({
      "GET auth/consents/": { body: [] },
      "GET auth/reminder/": () => ({ body: saved }),
      "PUT auth/reminder/": ({ body }) => {
        saved = { ...saved, ...(body as object) }
        return { body: saved }
      },
      "GET auth/reminder/status/": status({ reason: "early" }),
    })
    const user = userEvent.setup()
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    const daily = await screen.findByRole("radio", { name: /Una vez al día/ }, { timeout: 5000 })
    expect(daily).toBeChecked()
    expect(screen.getByLabelText("Hora")).toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: /Cada hora/ }))

    expect(
      await screen.findByText("Te recordaremos cada hora, de 8:00 a 21:00, hasta que registres una huella ese día."),
    ).toBeInTheDocument()
    expect(sentBody(fetchMock, "PUT auth/reminder/")).toEqual({ frequency: "hourly" })
    expect(screen.getByRole("radio", { name: /Cada hora/ })).toBeChecked()
    // La hora fija solo aplica a «una vez al día».
    expect(screen.queryByLabelText("Hora")).not.toBeInTheDocument()
  })

  it("si el navegador bloquea las notificaciones, lo dice", async () => {
    useFakeNotifications("denied")
    mockApi({
      "GET auth/consents/": { body: [] },
      "GET auth/reminder/": { body: { enabled: false, time: "20:00", frequency: "daily", last_notified_on: null } },
      "PUT auth/reminder/": { body: { enabled: true, time: "20:00", frequency: "daily", last_notified_on: null } },
    })
    const user = userEvent.setup()
    renderApp({ path: "/ajustes", user: SAMPLE_USER, locked: false })

    await user.click(await screen.findByRole("switch", { name: "Recordarme registrar mi huella" }, { timeout: 5000 }))

    expect(await screen.findByText(/Tu navegador bloqueó las notificaciones de Evoca/)).toBeInTheDocument()
  })
})

describe("HU5 · Escenario 2: a la hora elegida, sin huella hoy, llega la notificación y abre «Nueva huella»", () => {
  it("calcula la espera exacta hasta la hora elegida", () => {
    expect(msUntil("20:00", new Date(2026, 10, 6, 19, 59, 59))).toBe(1000)
    expect(msUntil("20:00", new Date(2026, 10, 6, 20, 0, 1))).toBe(24 * 3600 * 1000 - 1000)
  })

  it("cada hora: la próxima revisión es en la siguiente hora en punto", () => {
    expect(msUntilNextHour(new Date(2026, 10, 6, 9, 59, 59))).toBe(1000)
    expect(msUntilNextHour(new Date(2026, 10, 6, 10, 0, 0))).toBe(3600 * 1000)
    expect(msUntilNextCheck({ frequency: "hourly", time: "20:00" }, new Date(2026, 10, 6, 9, 30))).toBe(30 * 60 * 1000)
    expect(msUntilNextCheck({ frequency: "daily", time: "20:00" }, new Date(2026, 10, 6, 19, 30))).toBe(30 * 60 * 1000)
  })

  it("cada hora: al cambiar de hora vuelve a avisar si sigue sin huella", async () => {
    useFakeNotifications()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 6, 9, 59, 58))
    let checks = 0
    mockApi({
      ...HOME,
      "GET auth/reminder/status/": () => {
        checks += 1
        return checks === 1
          ? status({ frequency: "hourly", reason: "already_notified" })
          : status({ frequency: "hourly", due: true, reason: "due" })
      },
      "POST auth/reminder/ack/": { body: {} },
    })
    renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    await waitFor(() => expect(checks).toBe(1))
    expect(FakeNotification.created).toHaveLength(0)

    await act(() => vi.advanceTimersByTimeAsync(3000))

    await waitFor(() => expect(FakeNotification.created).toHaveLength(1))
    expect(FakeNotification.created[0].options.data).toEqual({ url: "/nueva-huella" })
  })

  it("cuando llega la hora muestra la notificación y la marca para no repetirla hoy", async () => {
    useFakeNotifications()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 6, 19, 59, 58))
    let checks = 0
    const fetchMock = mockApi({
      ...HOME,
      "GET auth/reminder/status/": () => {
        checks += 1
        return checks === 1 ? status({ reason: "early" }) : status({ due: true, reason: "due" })
      },
      "POST auth/reminder/ack/": { body: { enabled: true, time: "20:00", last_notified_on: "2026-11-06" } },
    })
    renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    await waitFor(() => expect(checks).toBe(1))
    expect(FakeNotification.created).toHaveLength(0)

    await act(() => vi.advanceTimersByTimeAsync(3000))

    await waitFor(() => expect(FakeNotification.created).toHaveLength(1))
    const [notification] = FakeNotification.created
    expect(notification.title).toBe(REMINDER_TEXT.title)
    expect(notification.options.body).toBe(REMINDER_TEXT.body)
    expect(notification.options.data).toEqual({ url: "/nueva-huella" })
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input, init]) => init?.method === "POST" && String(input).endsWith("reminder/ack/"))).toBe(true),
    )
  })

  it("al tocar la notificación se abre «Nueva huella»", async () => {
    useFakeNotifications()
    mockApi({
      ...HOME,
      "GET auth/reminder/status/": status({ due: true, reason: "due" }),
      "POST auth/reminder/ack/": { body: {} },
      "GET traces/catalog/": { body: { sensory_types: [], emotions: [] } },
    })
    const router = renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    await waitFor(() => expect(FakeNotification.created).toHaveLength(1))
    act(() => FakeNotification.created[0].onclick?.())

    await waitFor(() => expect(router.state.location.pathname).toBe("/nueva-huella"))
  })

  it("el service worker abre «Nueva huella» al tocar la notificación", async () => {
    const source = readFileSync(resolve(__dirname, "../../public/notification-click.js"), "utf8")
    const handlers: Record<string, (event: unknown) => void> = {}
    const openWindow = vi.fn(async () => undefined)
    const fakeSelf = {
      location: { origin: "https://evoca.test" },
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        handlers[type] = handler
      },
      clients: { matchAll: vi.fn(async () => []), openWindow },
    }
    new Function("self", source)(fakeSelf)
    let pending: Promise<unknown> = Promise.resolve()
    const close = vi.fn()

    handlers.notificationclick({ notification: { close, data: { url: "/nueva-huella" } }, waitUntil: (p: Promise<unknown>) => (pending = p) })
    await pending

    expect(close).toHaveBeenCalled()
    expect(openWindow).toHaveBeenCalledWith("https://evoca.test/nueva-huella")
  })
})

describe("HU5 · Escenario 3: si hoy ya registré una huella, no llega la notificación", () => {
  it("no muestra nada ni marca el aviso", async () => {
    useFakeNotifications()
    let checks = 0
    const fetchMock = mockApi({
      ...HOME,
      "GET auth/reminder/status/": () => {
        checks += 1
        return status({ due: false, reason: "already_registered" })
      },
    })
    renderApp({ path: "/", user: SAMPLE_USER, locked: false })

    await waitFor(() => expect(checks).toBeGreaterThan(0))
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))
    expect(FakeNotification.created).toHaveLength(0)
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("reminder/ack/"))).toBe(false)
  })
})
