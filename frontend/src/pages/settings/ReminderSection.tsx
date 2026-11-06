import { BellRing } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { GlassCard } from "@/components/evoca/GlassCard"
import { cn } from "@/lib/utils"
import { notificationsSupported, REMINDER_CHANGED_EVENT, reminderApi, type DailyReminder } from "@/lib/reminder"

const BLOCKED =
  "Tu navegador bloqueó las notificaciones de Evoca. Actívalas en la configuración del sitio para recibir el recordatorio."

/** HU5: activar o desactivar el recordatorio diario y elegir su hora. */
export function ReminderSection() {
  const timeId = useId()
  const [reminder, setReminder] = useState<DailyReminder | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const run = { cancelled: false }
    reminderApi
      .get()
      .then((data) => {
        if (!run.cancelled) setReminder(data)
      })
      .catch((error: Error) => {
        if (!run.cancelled) setWarning(error.message)
      })
    return () => {
      run.cancelled = true
    }
  }, [])

  const save = async (changes: Partial<Pick<DailyReminder, "enabled" | "time">>) => {
    setBusy(true)
    setWarning(null)
    try {
      const saved = await reminderApi.save(changes)
      setReminder(saved)
      window.dispatchEvent(new Event(REMINDER_CHANGED_EVENT))
      setNotice(
        saved.enabled
          ? `Te recordaremos a las ${saved.time} si ese día no has registrado una huella.`
          : "Desactivaste el recordatorio diario.",
      )
      return saved
    } catch (error) {
      setWarning((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = async () => {
    if (!reminder) return
    const enabling = !reminder.enabled
    if (enabling) {
      if (!notificationsSupported()) setWarning("Este navegador no permite notificaciones.")
      else if (Notification.permission === "default") await Notification.requestPermission()
    }
    const saved = await save({ enabled: enabling, time: reminder.time })
    if (saved?.enabled && notificationsSupported() && Notification.permission === "denied") setWarning(BLOCKED)
  }

  return (
    <GlassCard as="section" aria-labelledby="recordatorio" className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary">
          <BellRing aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="recordatorio" className="text-xl font-semibold">
            Recordatorio diario
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un aviso a la hora que elijas para crear el hábito. Si ese día ya registraste una huella, no te
            molestamos.
          </p>
        </div>
      </div>

      {reminder && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={reminder.enabled}
            disabled={busy}
            onClick={toggle}
            className={cn(
              "inline-flex min-h-11 items-center gap-3 rounded-full border px-4 font-semibold transition-colors",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
              reminder.enabled ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "relative h-6 w-10 rounded-full transition-colors",
                reminder.enabled ? "bg-primary-foreground/30" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-current transition-transform",
                  reminder.enabled ? "translate-x-5" : "translate-x-1",
                )}
              />
            </span>
            Recordarme registrar mi huella
          </button>

          <label htmlFor={timeId} className="flex items-center gap-2 text-sm font-semibold">
            Hora
            <input
              id={timeId}
              type="time"
              step={60}
              value={reminder.time}
              disabled={busy}
              onChange={(event) => {
                const time = event.target.value
                setReminder({ ...reminder, time })
                if (time) void save({ time })
              }}
              className="h-11 rounded-2xl border border-input bg-background/70 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>
      )}

      {notice && (
        <p role="status" className="text-sm font-medium">
          {notice}
        </p>
      )}
      {warning && <p className="rounded-2xl bg-support p-3 text-sm text-support-ink">{warning}</p>}
      <p className="text-xs text-muted-foreground">
        El aviso llega mientras Evoca esté abierta o en segundo plano en este dispositivo.
      </p>
    </GlassCard>
  )
}
