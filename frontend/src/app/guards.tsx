import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { useAuth } from "@/hooks/use-auth"

import { AppLock } from "./AppLock"
import { ReminderScheduler } from "./ReminderScheduler"

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center evoca-backdrop">
      <EvocaLoader label="Abriendo Evoca" />
    </div>
  )
}

/**
 * Pantallas de la app: exigen sesión y PIN creado. Si la app está bloqueada, nada de su
 * contenido se monta (ni se piden datos) hasta que la persona ingresa el PIN.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, locked } = useAuth()
  const location = useLocation()

  if (status === "loading") return <FullScreenLoader />
  if (status === "anonymous") return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (!user?.has_pin) return <Navigate to="/crear-pin" replace />
  // El recordatorio funciona aunque la app esté bloqueada (al tocarlo se pide el PIN).
  return (
    <>
      <ReminderScheduler />
      {locked ? <AppLock /> : children}
    </>
  )
}

/** Crear el PIN: solo con sesión y mientras todavía no hay PIN. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  if (status === "loading") return <FullScreenLoader />
  if (status === "anonymous") return <Navigate to="/entrar" replace />
  if (user?.has_pin) return <Navigate to="/" replace />
  return children
}

/** Entrar y registrarse: si ya hay sesión, se va directo a la app. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  if (status === "loading") return <FullScreenLoader />
  if (status === "authenticated") return <Navigate to={user?.has_pin ? "/" : "/crear-pin"} replace />
  return children
}
