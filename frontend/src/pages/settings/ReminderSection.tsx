import { BellRing, Clock, Repeat } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { GlassCard } from "@/components/evoca/GlassCard"
import { cn } from "@/lib/utils"
import {
  HOURLY_WINDOW,
  notificationsSupported,
  REMINDER_CHANGED_EVENT,
  reminderApi,
  type DailyReminder,
  type ReminderFrequency,
} from "@/lib/reminder"

const BLOCKED =
  "Tu navegador bloqueó las notificaciones de Evoca. Actívalas en la configuración del sitio para recibir el recordatorio."

const FREQUENCIES: Array<{ value: ReminderFrequency; label: string; hint: string; icon: typeof Clock }> = [
  { value: "daily", label: "Una vez al día", hint: "A la hora que elijas", icon: Clock },
  {
    value: "hourly",
    label: "Cada hora",
    hint: `De ${HOURLY_WINDOW.first} a ${HOURLY_WINDOW.last}`,
    icon: Repeat,
  },
]

function enabledNotice(reminder: DailyReminder) {
  return reminder.frequency === "hourly"
    ? `Te recordaremos cada hora, de ${HOURLY_WINDOW.first} a ${HOURLY_WINDOW.last}, hasta que registres una huella ese día.`
    : `Te recordaremos a las ${reminder.time} si ese día no has registrado una huella.`
}

type Changes = Partial<Pick<DailyReminder, "enabled" | "time" | "frequency">>

/** HU5: activar o desactivar el recordatorio y elegir si avisa a una hora o cada hora. */
export function ReminderSection() {
  const timeId = useId()
  const frequencyName = useId()
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

  const save = async (changes: Changes) => {
    setBusy(true)
    setWarning(null)
    try {
      const saved = await reminderApi.save(changes)
      setReminder(saved)
      window.dispatchEvent(new Event(REMINDER_CHANGED_EVENT))
      setNotice(saved.enabled ? enabledNotice(saved) : "Desactivaste el recordatorio diario.")
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
            Un aviso para crear el hábito. Si ese día ya registraste una huella, no te molestamos.
          </p>
        </div>
      </div>

      {reminder && (
        <div className="flex flex-col gap-3">
          {/* Toda la fila es el interruptor: el área táctil es amplia y el texto es su nombre. */}
          <button
            type="button"
            role="switch"
            aria-checked={reminder.enabled}
            disabled={busy}
            onClick={toggle}
            className={cn(
              "flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-2 text-left font-semibold",
              "transition-colors hover:bg-background/80 disabled:opacity-60",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            Recordarme registrar mi huella
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 ring-1 transition-colors duration-300 ring-inset",
                reminder.enabled ? "bg-primary ring-primary" : "bg-input ring-muted-foreground/60",
              )}
            >
              <span
                className={cn(
                  "size-6 rounded-full shadow-sm transition-transform duration-300 ease-spring",
                  reminder.enabled ? "translate-x-6 bg-primary-foreground" : "translate-x-0 bg-background",
                )}
              />
            </span>
          </button>

          {reminder.enabled && (
            <fieldset className="flex flex-col gap-3" disabled={busy}>
              <legend className="mb-2 text-sm font-semibold">¿Cada cuánto te aviso?</legend>
              <div className="grid grid-cols-2 gap-1 rounded-3xl bg-muted p-1">
                {FREQUENCIES.map((option) => {
                  const checked = reminder.frequency === option.value
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "grid min-h-14 cursor-pointer grid-cols-[auto_1fr] content-center items-center gap-x-2 rounded-[1.25rem] px-3 py-2 leading-tight transition-colors",
                        "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                        checked ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <input
                        type="radio"
                        name={frequencyName}
                        value={option.value}
                        checked={checked}
                        onChange={() => void save({ frequency: option.value })}
                        className="sr-only"
                      />
                      <option.icon aria-hidden="true" className="row-span-2 size-4" />
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className="text-xs">{option.hint}</span>
                    </label>
                  )
                })}
              </div>

              {reminder.frequency === "daily" && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-2">
                  <label htmlFor={timeId} className="text-sm font-semibold">
                    Hora
                  </label>
                  <input
                    id={timeId}
                    type="time"
                    step={60}
                    value={reminder.time}
                    onChange={(event) => {
                      const time = event.target.value
                      setReminder({ ...reminder, time })
                      if (time) void save({ time })
                    }}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-base font-semibold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark"
                  />
                </div>
              )}
            </fieldset>
          )}
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
