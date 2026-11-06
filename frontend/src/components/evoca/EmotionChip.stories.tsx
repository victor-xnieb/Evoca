import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { EMOTION_OPTIONS } from "@/mocks/fixtures"

import { EmotionChip } from "./EmotionChip"

const meta = {
  title: "Evoca/EmotionChip",
  component: EmotionChip,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Chip de emoción con su color, ícono y etiqueta (nunca solo color). Como botón sirve para elegir la emoción al registrar una huella o para filtrar; estático, etiqueta una huella.",
      },
    },
  },
  args: { emotion: "calma", label: "Calma", onSelect: fn() },
  argTypes: {
    emotion: { control: "select", options: EMOTION_OPTIONS.map((option) => option.value) },
  },
} satisfies Meta<typeof EmotionChip>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Seleccionado: Story = { args: { emotion: "alegria", label: "Alegría", selected: true } }

export const Deshabilitado: Story = { args: { emotion: "tristeza", label: "Tristeza", disabled: true } }

export const Estatico: Story = {
  name: "Estático (etiqueta)",
  args: { emotion: "nostalgia", label: "Nostalgia", onSelect: undefined },
}

export const Pequeno: Story = { name: "Pequeño", args: { size: "sm", onSelect: undefined } }

function PaletteDemo() {
  const [selected, setSelected] = useState<string | null>("gratitud")
  return (
    <div className="flex max-w-xl flex-wrap gap-2" role="group" aria-label="Emociones">
      {EMOTION_OPTIONS.map((option) => (
        <EmotionChip
          key={option.value}
          emotion={option.value}
          label={option.label}
          selected={selected === option.value}
          onSelect={setSelected}
        />
      ))}
    </div>
  )
}

/** Las 8 emociones; toca para ver cómo se iluminan. */
export const Paleta: Story = { render: () => <PaletteDemo /> }
