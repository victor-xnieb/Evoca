import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { SENSORY_OPTIONS } from "@/mocks/fixtures"

import { SensoryTypePicker } from "./SensoryTypePicker"

const meta = {
  title: "Evoca/SensoryTypePicker",
  component: SensoryTypePicker,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Cuadrícula de los 6 tipos sensoriales con íconos grandes para elegir con un toque. Las etiquetas llegan de la API. Entrada escalonada al aparecer.",
      },
    },
  },
  args: { options: SENSORY_OPTIONS, value: null, onChange: fn() },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof SensoryTypePicker>

export default meta
type Story = StoryObj<typeof meta>

export const SinElegir: Story = { name: "Sin elegir" }

export const Seleccionado: Story = { args: { value: "song" } }

export const Error: Story = { args: { error: "Elige qué despertó este recuerdo." } }

export const Deshabilitado: Story = { args: { value: "aroma", disabled: true } }

function InteractiveDemo() {
  const [value, setValue] = useState<string | null>(null)
  return <SensoryTypePicker options={SENSORY_OPTIONS} value={value} onChange={setValue} />
}

export const Interactivo: Story = { render: () => <InteractiveDemo /> }
