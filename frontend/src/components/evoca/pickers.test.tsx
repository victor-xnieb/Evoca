import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { EMOTION_OPTIONS, SENSORY_OPTIONS } from "@/mocks/fixtures"
import { renderWithProviders } from "@/test/render"

import { EmotionChip } from "./EmotionChip"
import { IntensityPicker } from "./IntensityPicker"
import { SensoryTypePicker } from "./SensoryTypePicker"

describe("EmotionChip", () => {
  it("muestra la etiqueta junto al color (nunca solo color)", () => {
    renderWithProviders(<EmotionChip emotion="calma" label="Calma" />)
    const chip = screen.getByText("Calma").closest("[data-emotion]")
    expect(chip).toHaveAttribute("data-emotion", "calma")
    expect(chip?.querySelector("svg")).not.toBeNull()
  })

  it("como botón comunica si está seleccionado y avisa al elegirse", async () => {
    const onSelect = vi.fn()
    renderWithProviders(<EmotionChip emotion="alegria" label="Alegría" onSelect={onSelect} />)
    const chip = screen.getByRole("button", { name: "Alegría" })
    expect(chip).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(chip)

    expect(onSelect).toHaveBeenCalledWith("alegria")
  })

  it("no responde cuando está deshabilitado", async () => {
    const onSelect = vi.fn()
    renderWithProviders(<EmotionChip emotion="miedo" label="Miedo" onSelect={onSelect} disabled />)
    await userEvent.click(screen.getByRole("button", { name: "Miedo" }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("usa texto en negrita para enojo, el color de contraste más justo", () => {
    renderWithProviders(<EmotionChip emotion="enojo" label="Enojo" />)
    expect(screen.getByText("Enojo")).toHaveClass("font-bold")
  })

  it("acepta las 8 emociones de la paleta", () => {
    renderWithProviders(
      <div>
        {EMOTION_OPTIONS.map((option) => (
          <EmotionChip key={option.value} emotion={option.value} label={option.label} />
        ))}
      </div>,
    )
    for (const option of EMOTION_OPTIONS) expect(screen.getByText(option.label)).toBeInTheDocument()
  })
})

function ControlledIntensity({ onChange }: { onChange?: (value: number) => void }) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <IntensityPicker
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe("IntensityPicker", () => {
  it("ofrece exactamente 5 niveles, del 1 al 5", () => {
    renderWithProviders(<ControlledIntensity />)
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(5)
    expect(radios[0]).toHaveAccessibleName("1 de 5, muy baja")
    expect(radios[4]).toHaveAccessibleName("5 de 5, muy alta")
  })

  it("selecciona con un toque y se mueve con las flechas", async () => {
    const onChange = vi.fn()
    renderWithProviders(<ControlledIntensity onChange={onChange} />)

    await userEvent.click(screen.getByRole("radio", { name: /3 de 5/ }))
    expect(screen.getByRole("radio", { name: /3 de 5/ })).toHaveAttribute("aria-checked", "true")

    await userEvent.keyboard("{ArrowRight}")
    expect(onChange).toHaveBeenLastCalledWith(4)
    await userEvent.keyboard("{End}")
    expect(onChange).toHaveBeenLastCalledWith(5)
    await userEvent.keyboard("{ArrowRight}")
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it("muestra el mensaje de error asociado al grupo", () => {
    renderWithProviders(<IntensityPicker value={null} onChange={() => {}} error="Elige qué tan intenso fue." />)
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("Elige qué tan intenso fue.")
  })
})

describe("SensoryTypePicker", () => {
  it("muestra los 6 tipos sensoriales con su etiqueta", () => {
    renderWithProviders(<SensoryTypePicker options={SENSORY_OPTIONS} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole("radio")).toHaveLength(6)
    expect(screen.getByRole("radio", { name: "Canción" })).toBeInTheDocument()
  })

  it("elige un tipo y permite moverse con las flechas", async () => {
    const onChange = vi.fn()
    renderWithProviders(<SensoryTypePicker options={SENSORY_OPTIONS} value="aroma" onChange={onChange} />)

    expect(screen.getByRole("radio", { name: "Aroma" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(screen.getByRole("radio", { name: "Lugar" }))
    expect(onChange).toHaveBeenLastCalledWith("place")

    screen.getByRole("radio", { name: "Aroma" }).focus()
    await userEvent.keyboard("{ArrowDown}")
    expect(onChange).toHaveBeenLastCalledWith("flavor")
  })
})
