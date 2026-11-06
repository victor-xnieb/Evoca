import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DRAFT_HELP_LINES, FIXED_NOW, SAMPLE_MOOD_POINTS, SAMPLE_TRACES } from "@/mocks/fixtures"
import { renderWithProviders } from "@/test/render"

import { DayCell } from "./DayCell"
import { EmptyState } from "./EmptyState"
import { EvocaLoader } from "./EvocaLoader"
import { MoodChart } from "./MoodChart"
import { SupportCard } from "./SupportCard"
import { TraceCard, TraceCardSkeleton } from "./TraceCard"

describe("TraceCard", () => {
  const trace = SAMPLE_TRACES[0]

  it("muestra tipo, nota, emoción, intensidad, etiquetas y fecha relativa", () => {
    renderWithProviders(
      <TraceCard trace={trace} sensoryLabel="Aroma" emotionLabel="Nostalgia" now={FIXED_NOW} />,
    )
    expect(screen.getByText("Aroma")).toBeInTheDocument()
    expect(screen.getByText(trace.note)).toBeInTheDocument()
    expect(screen.getByText("Nostalgia")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Intensidad 4 de 5" })).toBeInTheDocument()
    expect(screen.getByText("#familia")).toBeInTheDocument()
    expect(screen.getByText("hace 2 horas")).toBeInTheDocument()
  })

  it("se abre al tocarla si es interactiva", async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <TraceCard trace={trace} sensoryLabel="Aroma" emotionLabel="Nostalgia" onOpen={onOpen} now={FIXED_NOW} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Aroma, Nostalgia/ }))
    expect(onOpen).toHaveBeenCalledWith(trace)
  })

  it("tiene un marcador de carga oculto a lectores de pantalla", () => {
    const { container } = renderWithProviders(<TraceCardSkeleton />)
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true")
  })
})

describe("DayCell", () => {
  const date = new Date(2026, 10, 5)

  it("con registros toma el color e ícono de la emoción dominante", () => {
    renderWithProviders(
      <DayCell date={date} emotion="calma" emotionLabel="Calma" averageIntensity={3.4} onSelect={() => {}} />,
    )
    const day = screen.getByRole("button", { name: /calma, intensidad promedio 3,4/i })
    expect(day.style.getPropertyValue("--day-color")).toBe("var(--emotion-calma)")
    expect(day.querySelector("svg")).not.toBeNull()
  })

  it("sin registros usa el beige neutro y un texto sin juicio", () => {
    renderWithProviders(<DayCell date={date} onSelect={() => {}} />)
    const day = screen.getByRole("button", { name: /sin registros/ })
    expect(day.style.getPropertyValue("--day-color")).toBe("var(--evoca-day-empty)")
    expect(day.querySelector("svg")).toBeNull()
  })

  it("marca el día actual y avisa al tocarlo", async () => {
    const onSelect = vi.fn()
    renderWithProviders(<DayCell date={date} isToday emotion="alegria" emotionLabel="Alegría" onSelect={onSelect} />)
    const day = screen.getByRole("button", { name: /^Hoy,/ })
    expect(day).toHaveAttribute("aria-current", "date")
    await userEvent.click(day)
    expect(onSelect).toHaveBeenCalledWith(date)
  })
})

describe("MoodChart", () => {
  it("resume el promedio y ofrece una tabla con cada registro real", async () => {
    renderWithProviders(<MoodChart points={SAMPLE_MOOD_POINTS} average={3.3} periodLabel="esta semana" />)

    expect(screen.getByText("Promedio esta semana: 3,3 de 5, con 7 registros.")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(SAMPLE_MOOD_POINTS.length + 1)

    await userEvent.click(screen.getByRole("button", { name: "Ver como tabla" }))
    expect(screen.getByRole("button", { name: "Ver gráfica" })).toHaveAttribute("aria-expanded", "true")
  })

  it("sin registros invita a registrar la primera huella", () => {
    renderWithProviders(
      <MoodChart points={[]} average={null} periodLabel="este mes" emptyAction={<a href="/nueva-huella">Registrar</a>} />,
    )
    expect(screen.getByRole("heading", { name: "Aún no hay registros este mes" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar" })).toBeInTheDocument()
  })

  it("en error permite reintentar", async () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <MoodChart points={[]} average={null} periodLabel="esta semana" error="Sin conexión" onRetry={onRetry} />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tu gráfica")
    await userEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }))
    expect(onRetry).toHaveBeenCalled()
  })
})

describe("SupportCard", () => {
  it("ofrece las líneas como enlaces para llamar y registra la apertura", async () => {
    const onOpenHelp = vi.fn()
    renderWithProviders(
      <SupportCard title="Aquí hay apoyo" message="Hablar con alguien puede ayudar." lines={DRAFT_HELP_LINES} onOpenHelp={onOpenHelp} draft />,
    )
    const link = screen.getByRole("link", { name: /Línea 192/ })
    expect(link).toHaveAttribute("href", "tel:192")
    link.addEventListener("click", (event) => event.preventDefault())
    await userEvent.click(link)
    expect(onOpenHelp).toHaveBeenCalledWith(DRAFT_HELP_LINES[0])
    expect(screen.getByText(/Contenido provisional/)).toBeInTheDocument()
  })

  it("se puede cerrar con «Ahora no»", async () => {
    const onDismiss = vi.fn()
    renderWithProviders(<SupportCard title="Aquí hay apoyo" message="..." lines={[]} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole("button", { name: "Ahora no" }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it("es sobria: no usa animaciones ni el color de alerta", () => {
    const { container } = renderWithProviders(<SupportCard title="Aquí hay apoyo" message="..." lines={DRAFT_HELP_LINES} />)
    const html = container.innerHTML
    expect(html).not.toMatch(/animate-|emotion-enojo|destructive/)
  })
})

describe("EmptyState y EvocaLoader", () => {
  it("el estado vacío presenta título, descripción y acción", () => {
    renderWithProviders(
      <EmptyState title="Aún no tienes huellas" description="Registra la primera." action={<button>Empezar</button>} />,
    )
    expect(screen.getByRole("heading", { name: "Aún no tienes huellas" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Empezar" })).toBeInTheDocument()
  })

  it("la variante de error se anuncia como alerta", () => {
    renderWithProviders(<EmptyState variant="error" title="No pudimos cargar" />)
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar")
  })

  it("el loader se anuncia a lectores de pantalla", () => {
    renderWithProviders(<EvocaLoader label="Guardando tu huella…" />)
    expect(screen.getByRole("status")).toHaveTextContent("Guardando tu huella…")
  })
})
