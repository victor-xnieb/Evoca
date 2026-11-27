import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"

import type { Letter } from "@/lib/diary"
import { DRAFT_HELP_LINES, EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { mockApi, SAMPLE_USER, sentBody } from "@/test/api-mock"
import { renderApp } from "@/test/render-app"

const SUPPORT = {
  body: {
    version: "draft-v1",
    draft: true,
    help_title: "Puedes hablar con alguien ahora",
    help_message: "Lo que sientes importa.",
    help_lines: DRAFT_HELP_LINES,
    risk_terms: ["suicidio"],
    orientation_title: "Aquí hay apoyo",
    orientation_message: "…",
  },
}
const HOME = {
  "GET traces/catalog/": { body: { sensory_types: SENSORY_OPTIONS, emotions: EMOTION_OPTIONS } },
  "GET traces/": { body: { count: 0, next: null, previous: null, results: [] } },
  "GET support/orientation/": { body: { show: false } },
  "GET support/content/": SUPPORT,
  "GET weekly-summary/": {
    body: { enabled: false, status: "disabled", week_start: "2026-11-16", week_end: "2026-11-22", required: 5, missing: 0, count: 0, patterns: [] },
  },
}

const TEXT = "Querida yo del futuro: hoy llovió y el café olía a casa."
const letter = (id: string, extra: Partial<Letter> = {}): Letter => ({
  id,
  opens_on: "2027-05-26",
  font: "caveat",
  ink: "sepia",
  ready: false,
  opened_at: null,
  created_at: "2026-08-29T15:00:00-05:00",
  ...extra,
})
const SEALED = letter("l-1")
const ARRIVED = letter("l-2", { opens_on: "2026-11-27", ready: true })
const OPENED = letter("l-3", { opens_on: "2026-11-20", ready: true, opened_at: "2026-11-21T09:00:00-05:00", content: TEXT, ink: "vino" })

const open = (path: string) => renderApp({ path, user: SAMPLE_USER, locked: false })

beforeAll(async () => {
  await import("@/pages/DiaryPage")
  await import("@/pages/diary/LetterWritePage")
  await import("@/pages/diary/LetterPage")
}, 60_000)

describe("HU19 · Escenario 1: escribo una carta y queda sellada hasta la fecha que elijo", () => {
  it("se escribe, se elige la fecha, la letra y la tinta, y se sella", async () => {
    const fetchMock = mockApi({
      "GET support/content/": SUPPORT,
      "POST diary/letters/": ({ body }) => ({ status: 201, body: letter("l-9", { opens_on: (body as { opens_on: string }).opens_on }) }),
    })
    const user = userEvent.setup()
    open("/cuadernillo/cartas/nueva")

    await user.type(await screen.findByLabelText("Tu carta", {}, { timeout: 8000 }), TEXT)
    fireEvent.change(screen.getByLabelText("Se abre el"), { target: { value: "2027-11-27" } })
    await user.selectOptions(screen.getByLabelText("Letra"), "kalam")
    await user.click(screen.getByRole("radio", { name: "Morado" }))
    expect(screen.getByText("Al sellarla no podrás leerla ni cambiarla hasta el 27 de noviembre de 2027.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Sellar carta" }))

    expect(await screen.findByRole("heading", { name: "Carta sellada" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Se abre el 27 de noviembre de 2027.")
    expect(sentBody(fetchMock, "POST diary/letters/")).toEqual({ content: TEXT, opens_on: "2027-11-27", font: "kalam", ink: "morado" })
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument()
  })

  it("sin texto o sin fecha no se sella", async () => {
    const fetchMock = mockApi({ "GET support/content/": SUPPORT })
    const user = userEvent.setup()
    open("/cuadernillo/cartas/nueva")

    await user.click(await screen.findByRole("button", { name: "Sellar carta" }, { timeout: 8000 }))

    expect(screen.getByText("Escribe tu carta antes de sellarla.")).toBeInTheDocument()
    expect(screen.getByText("Elige cuándo se abre.")).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("muestra el aviso del servidor si la fecha no es futura", async () => {
    mockApi({
      "GET support/content/": SUPPORT,
      "POST diary/letters/": { status: 400, body: { opens_on: ["Elige una fecha futura: desde mañana."] } },
    })
    const user = userEvent.setup()
    open("/cuadernillo/cartas/nueva")

    await user.type(await screen.findByLabelText("Tu carta", {}, { timeout: 8000 }), TEXT)
    fireEvent.change(screen.getByLabelText("Se abre el"), { target: { value: "2026-01-01" } })
    await user.click(screen.getByRole("button", { name: "Sellar carta" }))

    expect(await screen.findByText("Elige una fecha futura: desde mañana.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Carta sellada" })).not.toBeInTheDocument()
  })

  it("una palabra de riesgo en la carta abre la ayuda de inmediato", async () => {
    const fetchMock = mockApi({ "GET support/content/": SUPPORT })
    const user = userEvent.setup()
    open("/cuadernillo/cartas/nueva")
    const box = await screen.findByLabelText("Tu carta", {}, { timeout: 8000 })
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("support/content/"))).toBe(true))

    await user.type(box, "Pensé en el suicidio ")

    const help = await screen.findByRole("dialog", {}, { timeout: 4000 })
    expect(help).toHaveTextContent("Puedes hablar con alguien ahora")
    expect(within(help).getByRole("button", { name: "Volver a mi carta" })).toBeInTheDocument()
  })

  it("una carta sellada dice cuándo se abre y no se puede abrir", async () => {
    mockApi({ "GET diary/letters/l-1/": { body: SEALED } })
    open("/cuadernillo/cartas/l-1")

    expect(await screen.findByRole("heading", { name: "Carta sellada" }, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByText(/^Se abre el 26 de mayo de 2027\. Falta/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Abrir el sobre" })).not.toBeInTheDocument()
    expect(screen.queryByRole("article", { name: "Tu carta" })).not.toBeInTheDocument()
  })
})

describe("HU19 · Escenario 2: el día de la carta, un aviso en Inicio y abro el sobre", () => {
  it("Inicio avisa con amabilidad y lleva al sobre", async () => {
    mockApi({ ...HOME, "GET diary/letters/": { body: [SEALED, ARRIVED, OPENED] } })
    const user = userEvent.setup()
    open("/")

    const notice = await screen.findByRole("heading", { name: "Llegó una carta de tu yo del pasado" }, { timeout: 8000 })
    expect(screen.getByText("La escribiste el 29 de agosto de 2026. Ya puedes abrir el sobre.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Abrir el sobre" })).toHaveAttribute("href", "/cuadernillo/cartas/l-2")

    await user.click(screen.getByRole("button", { name: "Ahora no" }))
    expect(notice).not.toBeInTheDocument()
  })

  it.each([
    ["no hay cartas que hayan llegado", { body: [SEALED, OPENED] }],
    ["el Cuadernillo no responde", { status: 503, body: { detail: "No disponible." } }],
  ])("sin aviso cuando %s", async (_, reply) => {
    const fetchMock = mockApi({ ...HOME, "GET diary/letters/": reply })
    open("/")
    await screen.findByText("Tu memoria sensorial, un camino para conocerte y cuidar cómo te sientes.", {}, { timeout: 8000 })
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("diary/letters/"))).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText(/Llegó una carta|Llegaron/)).not.toBeInTheDocument()
  })

  it("al abrir el sobre aparece la carta", async () => {
    const fetchMock = mockApi({
      "GET diary/letters/l-2/": { body: ARRIVED },
      "POST diary/letters/l-2/open/": { body: { ...ARRIVED, opened_at: "2026-11-27T10:00:00-05:00", content: TEXT } },
    })
    const user = userEvent.setup()
    open("/cuadernillo/cartas/l-2")

    expect(await screen.findByRole("heading", { name: "Llegó tu carta" }, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Abrir el sobre" }))

    expect(await screen.findByRole("article", { name: "Tu carta" })).toHaveTextContent(TEXT)
    expect(screen.getByRole("heading", { name: "Tu carta del 29 de agosto de 2026" })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input, init]) => init?.method === "POST" && String(input).endsWith("diary/letters/l-2/open/"))).toBe(true)
  })

  it("una carta ya abierta se vuelve a leer", async () => {
    mockApi({ "GET diary/letters/l-3/": { body: OPENED } })
    open("/cuadernillo/cartas/l-3")
    expect(await screen.findByRole("article", { name: "Tu carta" }, { timeout: 8000 })).toHaveTextContent(TEXT)
  })
})

describe("HU19 · Escenario 3: en el Cuadernillo veo cuántas cartas tengo y cuándo se abre cada una", () => {
  it("lista las cartas con su fecha y sin su contenido", async () => {
    mockApi({ "GET diary/notebooks/": { body: [] }, "GET diary/letters/": { body: [SEALED, ARRIVED, OPENED] } })
    open("/cuadernillo")

    const section = await screen.findByRole("region", { name: "Cartas a mi yo del futuro" }, { timeout: 8000 })
    expect(await within(section).findByText("Tienes 3 cartas: 1 sellada y 1 lista para abrir.")).toBeInTheDocument()
    const list = within(section).getByRole("list", { name: "Mis cartas" })
    expect(within(list).getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Carta sellada: Se abre el 26 de mayo de 2027",
      "Carta sellada: Ya puedes abrirla",
      "Carta abierta: Abierta · se abría el 20 de noviembre de 2026",
    ])
    expect(section).not.toHaveTextContent("café")
    expect(within(section).getByRole("link", { name: "Escribir una carta" })).toHaveAttribute("href", "/cuadernillo/cartas/nueva")
  })

  it("sin cartas invita a escribir la primera", async () => {
    mockApi({ "GET diary/notebooks/": { body: [] }, "GET diary/letters/": { body: [] } })
    open("/cuadernillo")
    const section = await screen.findByRole("region", { name: "Cartas a mi yo del futuro" }, { timeout: 8000 })
    expect(await within(section).findByText("Escribe una carta y elige cuándo abrirla. Hasta ese día queda sellada.")).toBeInTheDocument()
  })
})
