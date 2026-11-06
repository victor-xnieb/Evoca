import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { IntensityPicker } from "./IntensityPicker"

const meta = {
  title: "Evoca/IntensityPicker",
  component: IntensityPicker,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Selector de intensidad de 1 a 5 (radiogroup accesible con flechas). El nivel elegido «late» con suavidad y toma el color de la emoción. Con movimiento reducido no late.",
      },
    },
  },
  args: { value: null, onChange: fn() },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof IntensityPicker>

export default meta
type Story = StoryObj<typeof meta>

export const SinElegir: Story = { name: "Sin elegir" }

export const Seleccionado: Story = { args: { value: 4, emotion: "alegria" } }

export const ConEmocionMiedo: Story = { name: "Con emoción (miedo)", args: { value: 3, emotion: "miedo" } }

export const Error: Story = { args: { error: "Elige qué tan intenso fue para poder guardar." } }

export const Deshabilitado: Story = { args: { value: 2, disabled: true } }

function InteractiveDemo() {
  const [value, setValue] = useState<number | null>(null)
  return <IntensityPicker value={value} onChange={setValue} emotion="calma" />
}

export const Interactivo: Story = { render: () => <InteractiveDemo /> }
