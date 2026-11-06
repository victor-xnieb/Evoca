import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import {
  msUntilNextCheck,
  notificationsSupported,
  REMINDER_CHANGED_EVENT,
  REMINDER_URL,
  reminderApi,
  showReminderNotification,
} from "@/lib/reminder"

/**
 * Lanza la notificación del recordatorio (HU5) a la hora elegida o cada hora en punto,
 * mientras Evoca está abierta o en segundo plano. El servidor decide si toca: hora alcanzada,
 * sin aviso pendiente y sin huella hoy. También revisa al abrir la app y al volver a ella.
 */
export function ReminderScheduler() {
  const navigate = useNavigate()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const reload = () => setVersion((value) => value + 1)
    window.addEventListener(REMINDER_CHANGED_EVENT, reload)
    return () => window.removeEventListener(REMINDER_CHANGED_EVENT, reload)
  }, [])

  useEffect(() => {
    const run = { cancelled: false, timer: 0 }

    const check = async () => {
      if (run.cancelled || !notificationsSupported() || Notification.permission !== "granted") return
      const status = await reminderApi.status().catch(() => null)
      if (!status || run.cancelled) return
      if (status.due) {
        await showReminderNotification(() => navigate(REMINDER_URL))
        await reminderApi.ack().catch(() => {})
      }
      window.clearTimeout(run.timer)
      if (status.enabled) run.timer = window.setTimeout(check, msUntilNextCheck(status) + 500)
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }

    void check()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      run.cancelled = true
      window.clearTimeout(run.timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [version, navigate])

  return null
}
