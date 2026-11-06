import { useCallback, useEffect, useState } from "react"

import { LockScreen } from "@/components/evoca/LockScreen"
import { useAuth } from "@/hooks/use-auth"
import { ApiError } from "@/lib/api"
import { authApi, type PinStatus } from "@/lib/auth"
import { isBiometricEnabled, verifyBiometric } from "@/lib/biometric"

interface LockState {
  error: string | null
  errorKey: number
  lockedUntil: Date | null
  busy: boolean
}

const lockedUntilOf = (status: { locked_until?: string | null } | null | undefined) =>
  status?.locked_until ? new Date(status.locked_until) : null

/**
 * Pide el PIN antes de mostrar la app. El servidor lleva la cuenta de intentos: tras 5
 * fallos responde 423 y el bloqueo de 5 minutos se respeta aunque se recargue la página.
 */
export function AppLock() {
  const { user, unlock, logout } = useAuth()
  const [state, setState] = useState<LockState>({ error: null, errorKey: 0, lockedUntil: null, busy: false })
  const biometric = user ? isBiometricEnabled(user.id) : false

  // Si quedó un bloqueo vigente (por ejemplo, tras recargar), se muestra la cuenta regresiva.
  useEffect(() => {
    let cancelled = false
    authApi
      .pinStatus()
      .then((status) => {
        if (!cancelled) setState((current) => ({ ...current, lockedUntil: lockedUntilOf(status) }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const submit = useCallback(
    async (pin: string) => {
      setState((current) => ({ ...current, busy: true }))
      try {
        await authApi.verifyPin(pin)
        unlock()
      } catch (error) {
        const data = error instanceof ApiError ? (error.data as Partial<PinStatus> | undefined) : undefined
        setState((current) => ({
          busy: false,
          errorKey: current.errorKey + 1,
          lockedUntil: error instanceof ApiError && error.status === 423 ? lockedUntilOf(data) : null,
          error: error instanceof ApiError && error.status === 423 ? null : (error as Error).message,
        }))
      }
    },
    [unlock],
  )

  const useBiometric = useCallback(async () => {
    if (!user) return
    if (await verifyBiometric(user.id)) unlock()
    else
      setState((current) => ({
        ...current,
        error: "No pudimos reconocer tu huella o rostro. Usa tu PIN.",
        errorKey: current.errorKey + 1,
      }))
  }, [unlock, user])

  const forgot = useCallback(
    () => logout("Entra con tu correo y contraseña. Luego puedes cambiar tu PIN en Ajustes."),
    [logout],
  )

  return (
    <LockScreen
      name={user?.first_name || undefined}
      onComplete={submit}
      error={state.error}
      errorKey={state.errorKey}
      lockedUntil={state.lockedUntil}
      onLockExpired={() => setState((current) => ({ ...current, lockedUntil: null, error: null }))}
      busy={state.busy}
      onBiometric={biometric ? useBiometric : undefined}
      onForgot={forgot}
    />
  )
}
