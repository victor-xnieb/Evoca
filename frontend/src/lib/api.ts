/**
 * Cliente de la API REST de Evoca (/api/v1/). Agrega el token de sesión,
 * convierte las respuestas de error de DRF en ApiError y avisa cuando la sesión expira.
 */

const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1"

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, "")

const TOKEN_KEY = "evoca.token"

/** Evento global que se emite cuando el servidor rechaza el token (401). */
export const UNAUTHORIZED_EVENT = "evoca:unauthorized"

let memoryToken: string | null = null

/**
 * Guarda el token. Se usa localStorage para sobrevivir a recargas de la PWA; si el
 * navegador lo bloquea (modo privado), queda solo en memoria durante la sesión.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY) ?? memoryToken
    } catch {
      return memoryToken
    }
  },
  set(token: string) {
    memoryToken = token
    try {
      window.localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Sin almacenamiento persistente: el token vive solo en memoria.
    }
  },
  clear() {
    memoryToken = null
    try {
      window.localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Nada que limpiar.
    }
  },
}

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors
  readonly data: unknown

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fieldErrors = fieldErrors
    this.data = data
  }

  /** Primer mensaje del campo indicado, útil para mostrarlo bajo cada input. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0]
  }
}

const NETWORK_MESSAGE = "No pudimos conectar con Evoca. Revisa tu conexión e inténtalo de nuevo."
const GENERIC_MESSAGE = "Algo no salió como esperábamos. Inténtalo de nuevo en un momento."

function toMessages(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toMessages)
  if (typeof value === "string") return [value]
  if (value && typeof value === "object") return Object.values(value).flatMap(toMessages)
  return []
}

/** Normaliza los formatos de error de DRF: {detail}, {campo: [..]} y {non_field_errors}. */
export function parseErrorBody(status: number, body: unknown): ApiError {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>
    const fieldErrors: FieldErrors = {}
    for (const [key, value] of Object.entries(record)) {
      if (key === "detail") continue
      fieldErrors[key] = toMessages(value)
    }
    const message =
      (typeof record.detail === "string" && record.detail) ||
      fieldErrors.non_field_errors?.[0] ||
      Object.values(fieldErrors)[0]?.[0] ||
      GENERIC_MESSAGE
    return new ApiError(status, message, fieldErrors, body)
  }
  if (Array.isArray(body)) {
    return new ApiError(status, toMessages(body)[0] ?? GENERIC_MESSAGE, {}, body)
  }
  return new ApiError(status, GENERIC_MESSAGE)
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  /** Por defecto las peticiones llevan el token; las rutas públicas usan auth: false. */
  auth?: boolean
  signal?: AbortSignal
  query?: Record<string, string | number | undefined | null>
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${API_URL}/${path.replace(/^\/+/, "")}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal, query } = options
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const token = auth ? tokenStore.get() : null
  if (token) headers.Authorization = `Token ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new ApiError(0, NETWORK_MESSAGE)
  }

  if (response.status === 401 && token) {
    tokenStore.clear()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  if (response.status === 204) return undefined as T

  const isJson = response.headers.get("content-type")?.includes("application/json")
  const data: unknown = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) throw parseErrorBody(response.status, data)
  return data as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = void>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
}

/** Respuesta paginada de DRF (PageNumberPagination). */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
