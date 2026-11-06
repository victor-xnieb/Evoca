import { api, apiRequest, tokenStore } from "./api"

/** Perfil que devuelve /auth/me/. */
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  date_of_birth: string
  date_joined: string
  has_pin: boolean
}

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  date_of_birth: string
  accepted_terms: boolean
  accepted_privacy: boolean
  accepted_health_data: boolean
}

export interface PinStatus {
  has_pin: boolean
  locked_until: string | null
  remaining_attempts: number
}

export interface Consent {
  consent_type: "terms" | "privacy" | "health_data"
  document_version: string
  accepted_at: string
  revoked_at: string | null
}

interface SessionResponse {
  token: string
  user: User
}

/** Llamadas de cuenta, PIN y derechos sobre los datos (HU1). */
export const authApi = {
  async register(payload: RegisterPayload): Promise<User> {
    const { token, user } = await api.post<SessionResponse>("auth/register/", payload, { auth: false })
    tokenStore.set(token)
    return user
  },
  async login(email: string, password: string): Promise<User> {
    const { token, user } = await api.post<SessionResponse>("auth/login/", { email, password }, { auth: false })
    tokenStore.set(token)
    return user
  },
  async logout() {
    try {
      await api.post("auth/logout/")
    } finally {
      tokenStore.clear()
    }
  },
  me: () => api.get<User>("auth/me/"),
  pinStatus: () => api.get<PinStatus>("auth/pin/"),
  setPin: (pin: string, password?: string) =>
    apiRequest<PinStatus>("auth/pin/", { method: "PUT", body: password ? { pin, password } : { pin } }),
  verifyPin: (pin: string) => api.post<PinStatus & { verified: true }>("auth/pin/verify/", { pin }),
  consents: () => api.get<Consent[]>("auth/consents/"),
  exportData: () => api.get<Record<string, unknown>>("auth/export/"),
  deleteAccount: (password: string) => apiRequest<void>("auth/account/", { method: "DELETE", body: { password } }),
}

/** Nombre del archivo de exportación, el mismo que propone el servidor. */
export function exportFileName(today = new Date()) {
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
  return `evoca-mis-datos-${local.toISOString().slice(0, 10)}.json`
}

/** Descarga un objeto como archivo JSON en el dispositivo. */
export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
