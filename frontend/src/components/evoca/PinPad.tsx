import { Delete, Fingerprint, LockKeyhole } from "lucide-react"
import { motion, useAnimate } from "motion/react"
import { useCallback, useEffect, useState } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

export interface PinPadProps {
  /** Se llama al completar los dígitos. */
  onComplete: (pin: string) => void
  length?: number
  title?: string
  description?: string
  /** Mensaje de error; cada cambio de errorKey hace «temblar» los puntos y limpia la entrada. */
  error?: string | null
  errorKey?: number
  /** Si hay bloqueo, hasta cuándo dura (lo informa el servidor). */
  lockedUntil?: Date | null
  /** Duración total del bloqueo, para dibujar la cuenta regresiva. */
  lockDurationMs?: number
  onUnlock?: () => void
  busy?: boolean
  /** Muestra el botón de huella o rostro (WebAuthn) cuando la persona lo activó. */
  onBiometric?: () => void
  className?: string
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}

/**
 * Teclado numérico para el PIN. Acepta toques y teclado físico, tiembla suavemente
 * al fallar y, durante un bloqueo, muestra una cuenta regresiva visual.
 */
export function PinPad({
  onComplete,
  length = 4,
  title = "Ingresa tu PIN",
  description,
  error,
  errorKey = 0,
  lockedUntil,
  lockDurationMs = 5 * 60 * 1000,
  onUnlock,
  busy = false,
  onBiometric,
  className,
}: PinPadProps) {
  const reduced = useReducedMotion()
  // Cada error nuevo (errorKey) vacía la entrada; se ajusta durante el render.
  const [entry, setEntry] = useState({ digits: "", errorKey })
  if (entry.errorKey !== errorKey) setEntry({ digits: "", errorKey })
  const digits = entry.errorKey === errorKey ? entry.digits : ""
  const [now, setNow] = useState(() => Date.now())
  const [scope, animate] = useAnimate<HTMLDivElement>()

  const remainingMs = lockedUntil ? lockedUntil.getTime() - now : 0
  const locked = remainingMs > 0
  const disabled = locked || busy

  // Cuenta regresiva del bloqueo.
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (lockedUntil.getTime() <= current) {
        window.clearInterval(timer)
        onUnlock?.()
      }
    }
    // Primer cálculo inmediato: la cuenta arranca en 5:00 y no con la hora del montaje.
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [lockedUntil, onUnlock])

  // Temblor al recibir un error nuevo.
  useEffect(() => {
    if (!errorKey) return
    if (!reduced && scope.current) {
      animate(scope.current, { x: [0, -10, 10, -7, 7, -3, 0] }, { duration: 0.42, ease: "easeOut" })
    }
  }, [errorKey, reduced, animate, scope])

  const press = useCallback(
    (key: string) => {
      if (disabled || digits.length >= length) return
      const next = digits + key
      setEntry({ digits: next, errorKey })
      if (next.length === length) onComplete(next)
    },
    [digits, disabled, errorKey, length, onComplete],
  )

  const erase = useCallback(() => {
    if (disabled) return
    setEntry({ digits: digits.slice(0, -1), errorKey })
  }, [digits, disabled, errorKey])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) press(event.key)
      else if (event.key === "Backspace") erase()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [press, erase])

  const keyClass = cn(
    "grid size-18 place-items-center rounded-full bg-card text-2xl font-semibold shadow-soft",
    "transition-colors duration-150 hover:bg-accent active:bg-secondary",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:cursor-not-allowed disabled:opacity-40",
  )

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary">
          <LockKeyhole aria-hidden="true" className="size-6" />
        </span>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description && <p className="max-w-xs text-muted-foreground">{description}</p>}
      </div>

      <div
        ref={scope}
        role="status"
        aria-label={`${digits.length} de ${length} dígitos ingresados`}
        className="flex gap-4"
      >
        {Array.from({ length }, (_, index) => {
          const filled = index < digits.length
          return (
            <motion.span
              key={index}
              aria-hidden="true"
              className={cn(
                "size-4 rounded-full border-2",
                filled ? "border-primary bg-primary" : "border-input bg-transparent",
                error && !filled && "border-destructive/60",
              )}
              animate={{ scale: filled && !reduced ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.22 }}
            />
          )
        })}
      </div>

      <div className="min-h-12 text-center" aria-live="polite">
        {locked ? (
          <div className="flex flex-col items-center gap-2">
            <p className="font-medium">
              Por tu seguridad, espera <span className="tabular-nums">{formatCountdown(remainingMs)}</span>{" "}
              para intentarlo de nuevo.
            </p>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <div
                className="h-full w-full origin-left rounded-full bg-ring transition-transform duration-1000 ease-linear"
                style={{ transform: `scaleX(${Math.min(1, remainingMs / lockDurationMs)})` }}
              />
            </div>
          </div>
        ) : (
          error && (
            <p role="alert" className="font-medium text-destructive">
              {error}
            </p>
          )
        )}
      </div>

      <div className="grid grid-cols-3 gap-4" aria-label="Teclado del PIN">
        {KEYS.map((key) => (
          <button key={key} type="button" className={keyClass} disabled={disabled} onClick={() => press(key)}>
            {key}
          </button>
        ))}
        {onBiometric ? (
          <button
            type="button"
            className={cn(keyClass, "bg-transparent shadow-none")}
            disabled={disabled}
            onClick={onBiometric}
            aria-label="Usar huella o rostro"
          >
            <Fingerprint aria-hidden="true" className="size-7" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button type="button" className={keyClass} disabled={disabled} onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          className={cn(keyClass, "bg-transparent shadow-none")}
          disabled={disabled || digits.length === 0}
          onClick={erase}
          aria-label="Borrar último dígito"
        >
          <Delete aria-hidden="true" className="size-6" />
        </button>
      </div>
    </div>
  )
}
