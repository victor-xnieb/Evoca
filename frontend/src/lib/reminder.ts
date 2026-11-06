import { api, apiRequest } from "./api"

/** Recordatorio diario (HU5). La hora es local, en formato HH:MM. */
export interface DailyReminder {
  enabled: boolean
  time: string
  last_notified_on: string | null
}

export interface ReminderStatus extends DailyReminder {
  due: boolean
  reason: "due" | "disabled" | "early" | "already_notified" | "already_registered"
}

export const reminderApi = {
  get: () => api.get<DailyReminder>("auth/reminder/"),
  save: (changes: Partial<Pick<DailyReminder, "enabled" | "time">>) =>
    apiRequest<DailyReminder>("auth/reminder/", { method: "PUT", body: changes }),
  status: () => api.get<ReminderStatus>("auth/reminder/status/"),
  ack: () => api.post<DailyReminder>("auth/reminder/ack/"),
}

/** Se emite al guardar el recordatorio para que el programador recalcule la próxima hora. */
export const REMINDER_CHANGED_EVENT = "evoca:reminder-changed"

/** Al tocar la notificación se abre «Nueva huella». */
export const REMINDER_URL = "/nueva-huella"

export const REMINDER_TEXT = {
  title: "Evoca",
  body: "¿Cómo te sentiste hoy? Registra tu huella en segundos.",
}

/** Milisegundos hasta la próxima vez que el reloj marque esa hora (hoy o mañana). */
export function msUntil(time: string, now = new Date()) {
  const [hours, minutes] = time.split(":").map(Number)
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window
}

/**
 * Muestra la notificación del recordatorio. Con el service worker de la PWA, al tocarla se
 * abre «Nueva huella» aunque la pestaña esté en segundo plano; sin él (por ejemplo, en
 * desarrollo) se usa una notificación simple que hace lo mismo con `onOpen`.
 */
export async function showReminderNotification(onOpen: () => void) {
  const options: NotificationOptions = {
    body: REMINDER_TEXT.body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: "evoca-recordatorio",
    data: { url: REMINDER_URL },
  }
  const registration =
    "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined
  if (registration) {
    await registration.showNotification(REMINDER_TEXT.title, options)
    return
  }
  const notification = new Notification(REMINDER_TEXT.title, options)
  notification.onclick = () => {
    window.focus()
    notification.close()
    onOpen()
  }
}
