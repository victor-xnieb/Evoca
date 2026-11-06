import { AnimatedBackground } from "./AnimatedBackground"
import { EvocaWordmark } from "./EvocaWordmark"
import { GlassCard } from "./GlassCard"
import { PinPad } from "./PinPad"
import { ThemeSwitch } from "./ThemeSwitch"

export interface LockScreenProps {
  /** Nombre para saludar («Hola, Ana»). */
  name?: string
  onComplete: (pin: string) => void
  error?: string | null
  errorKey?: number
  lockedUntil?: Date | null
  onLockExpired?: () => void
  busy?: boolean
  /** Si la persona activó la huella o el rostro en este dispositivo. */
  onBiometric?: () => void
  /** «¿Olvidaste tu PIN?»: cierra la sesión para entrar con la contraseña. */
  onForgot: () => void
}

/**
 * Pantalla que tapa toda la app hasta que la persona ingresa su PIN (o usa su huella o
 * rostro). Mismo fondo animado de la app, con el teclado en una tarjeta de vidrio.
 */
export function LockScreen({
  name,
  onComplete,
  error,
  errorKey,
  lockedUntil,
  onLockExpired,
  busy,
  onBiometric,
  onForgot,
}: LockScreenProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col evoca-backdrop">
      <AnimatedBackground />
      <header className="flex justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <ThemeSwitch />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-10">
        <p className="text-4xl">
          <EvocaWordmark />
        </p>
        <GlassCard as="section" aria-label="Desbloquear Evoca" className="w-full max-w-sm px-6 py-8">
          <PinPad
            title={name ? `Hola, ${name}` : "Ingresa tu PIN"}
            description="Ingresa tu PIN de 4 dígitos para ver tus recuerdos."
            onComplete={onComplete}
            error={error}
            errorKey={errorKey}
            lockedUntil={lockedUntil}
            onUnlock={onLockExpired}
            busy={busy}
            onBiometric={onBiometric}
          />
          <button
            type="button"
            onClick={onForgot}
            className="mx-auto mt-6 block min-h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            ¿Olvidaste tu PIN? Entra con tu contraseña
          </button>
        </GlassCard>
      </main>
    </div>
  )
}
