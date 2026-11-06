import { createContext, useContext } from "react"

import type { RegisterPayload, User } from "@/lib/auth"

export type AuthStatus = "loading" | "anonymous" | "authenticated"

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** La app pide el PIN (o la huella) antes de mostrar cualquier dato. */
  locked: boolean
  /** Aviso para la pantalla de entrar (por ejemplo, «Tu cuenta fue eliminada»). */
  notice: string | null
  login: (email: string, password: string) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: (notice?: string) => Promise<void>
  /** Cierra la sesión local sin llamar al servidor (por ejemplo, tras eliminar la cuenta). */
  endSession: (notice?: string) => void
  unlock: () => void
  markPinCreated: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return value
}
