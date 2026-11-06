import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { AuthContext, type AuthStatus } from "@/hooks/use-auth"
import { tokenStore, UNAUTHORIZED_EVENT } from "@/lib/api"
import { authApi, type RegisterPayload, type User } from "@/lib/auth"

interface AuthState {
  status: AuthStatus
  user: User | null
  locked: boolean
  notice: string | null
}

interface AuthProviderProps {
  children: ReactNode
  /** Solo para pruebas y Storybook: arranca con esta sesión sin consultar el servidor. */
  initialUser?: User | null
  initiallyLocked?: boolean
}

const ANONYMOUS: AuthState = { status: "anonymous", user: null, locked: false, notice: null }

/**
 * Sesión de la persona. Si hay un PIN activo, la app arranca bloqueada y se vuelve a
 * bloquear cada vez que regresa desde segundo plano (HU1 · escenario 2).
 */
export function AuthProvider({ children, initialUser, initiallyLocked }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    if (initialUser !== undefined) {
      return initialUser
        ? { status: "authenticated", user: initialUser, locked: initiallyLocked ?? initialUser.has_pin, notice: null }
        : ANONYMOUS
    }
    return tokenStore.get() ? { ...ANONYMOUS, status: "loading" } : ANONYMOUS
  })

  // Al abrir la app con una sesión guardada: se carga el perfil y, si hay PIN, se bloquea.
  useEffect(() => {
    if (state.status !== "loading") return
    let cancelled = false
    authApi
      .me()
      .then((user) => {
        if (!cancelled) setState({ status: "authenticated", user, locked: user.has_pin, notice: null })
      })
      .catch(() => {
        if (!cancelled) setState(ANONYMOUS)
      })
    return () => {
      cancelled = true
    }
  }, [state.status])

  // El servidor rechazó el token: la sesión terminó.
  useEffect(() => {
    const onUnauthorized = () => setState(ANONYMOUS)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // Al volver desde segundo plano se pide otra vez el PIN.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      setState((current) =>
        current.status === "authenticated" && current.user?.has_pin && !current.locked
          ? { ...current, locked: true }
          : current,
      )
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const user = await authApi.login(email, password)
    // Recién entró con su contraseña: no se le pide el PIN en ese momento.
    setState({ status: "authenticated", user, locked: false, notice: null })
    return user
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const user = await authApi.register(payload)
    setState({ status: "authenticated", user, locked: false, notice: null })
    return user
  }, [])

  // Sin sesión, las rutas protegidas llevan solas a /entrar, donde se muestra el aviso.
  const endSession = useCallback((notice?: string) => {
    tokenStore.clear()
    setState({ ...ANONYMOUS, notice: notice ?? null })
  }, [])

  const logout = useCallback(
    async (notice?: string) => {
      try {
        await authApi.logout()
      } catch {
        // Aunque el servidor no responda, la sesión se cierra en este dispositivo.
      }
      endSession(notice)
    },
    [endSession],
  )

  const unlock = useCallback(() => setState((current) => ({ ...current, locked: false })), [])

  const markPinCreated = useCallback(
    () =>
      setState((current) => (current.user ? { ...current, user: { ...current.user, has_pin: true } } : current)),
    [],
  )

  const value = useMemo(
    () => ({ ...state, login, register, logout, endSession, unlock, markPinCreated }),
    [state, login, register, logout, endSession, unlock, markPinCreated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
