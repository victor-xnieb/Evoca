import { vi } from "vitest"

import { API_URL } from "@/lib/api"
import type { User } from "@/lib/auth"

export interface MockReply {
  status?: number
  body?: unknown
}

type Handler = MockReply | ((request: { body: unknown; query: URLSearchParams }) => MockReply)

/**
 * Sustituye fetch por respuestas fijas por ruta: { "POST auth/pin/verify/": {...} }.
 * Devuelve el mock para revisar qué se envió.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const [url, search = ""] = String(input).replace(`${API_URL}/`, "").split("?")
    const key = `${init?.method ?? "GET"} ${url}`
    const handler = handlers[key]
    if (!handler) return new Response(JSON.stringify({ detail: `Sin simulación para ${key}` }), { status: 500 })
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    const reply = typeof handler === "function" ? handler({ body, query: new URLSearchParams(search) }) : handler
    const status = reply.status ?? 200
    if (status === 204) return new Response(null, { status })
    return new Response(JSON.stringify(reply.body ?? {}), {
      status,
      headers: { "content-type": "application/json" },
    })
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Cuerpo JSON de la n-ésima llamada a una ruta. */
export function sentBody(fetchMock: ReturnType<typeof mockApi>, key: string) {
  const call = fetchMock.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input).replace(`${API_URL}/`, "")}` === key)
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined
}

export const SAMPLE_USER: User = {
  id: "8b3f2c1e-0000-4000-8000-000000000001",
  email: "ana@example.com",
  first_name: "Ana",
  last_name: "",
  date_of_birth: "1995-04-12",
  date_joined: "2026-11-01T10:00:00Z",
  has_pin: true,
}
