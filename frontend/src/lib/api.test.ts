import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { API_URL, ApiError, UNAUTHORIZED_EVENT, api, parseErrorBody, tokenStore } from "./api"

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("cliente de la API", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    tokenStore.clear()
  })

  it("envía el token en la cabecera Authorization", async () => {
    tokenStore.set("abc123")
    fetchMock.mockResolvedValue(jsonResponse(200, { email: "ana@example.com" }))

    const data = await api.get<{ email: string }>("/auth/me/")

    expect(data.email).toBe("ana@example.com")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_URL}/auth/me/`)
    expect(init.headers.Authorization).toBe("Token abc123")
  })

  it("no envía el token en rutas públicas", async () => {
    tokenStore.set("abc123")
    fetchMock.mockResolvedValue(jsonResponse(200, { token: "nuevo" }))

    await api.post("/auth/login/", { email: "a@b.co", password: "x" }, { auth: false })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
    expect(init.body).toBe(JSON.stringify({ email: "a@b.co", password: "x" }))
    expect(init.headers["Content-Type"]).toBe("application/json")
  })

  it("agrega parámetros de consulta sin incluir valores vacíos", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { results: [] }))

    await api.get("/traces/", { query: { emotion: "calma", sensory_type: "", page: 2 } })

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/traces/?emotion=calma&page=2`)
  })

  it("convierte los errores de validación de DRF en errores por campo", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { date_of_birth: ["Evoca solo está disponible para mayores de 18 años."] }),
    )

    const error = await api.post("/auth/register/", {}, { auth: false }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).field("date_of_birth")).toBe("Evoca solo está disponible para mayores de 18 años.")
    expect((error as ApiError).message).toBe("Evoca solo está disponible para mayores de 18 años.")
  })

  it("limpia el token y avisa a la app cuando el servidor responde 401", async () => {
    tokenStore.set("vencido")
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: "Token inválido." }))
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await expect(api.get("/auth/me/")).rejects.toMatchObject({ status: 401, message: "Token inválido." })

    expect(tokenStore.get()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it("devuelve undefined en respuestas 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(api.delete("/traces/1/")).resolves.toBeUndefined()
  })

  it("explica con calma cuando no hay conexión", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(api.get("/health/")).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("No pudimos conectar"),
    })
  })
})

describe("parseErrorBody", () => {
  it("prioriza non_field_errors cuando no hay detail", () => {
    const error = parseErrorBody(400, { non_field_errors: ["Correo o contraseña incorrectos."] })
    expect(error.message).toBe("Correo o contraseña incorrectos.")
  })

  it("usa un mensaje genérico si el cuerpo no es JSON", () => {
    expect(parseErrorBody(500, null).message).toMatch(/Algo no salió como esperábamos/)
  })
})
