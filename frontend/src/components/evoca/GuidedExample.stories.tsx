import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { GuidedExample } from "./GuidedExample"

const meta = {
  title: "Evoca/GuidedExample",
  component: GuidedExample,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Ejemplo guiado que aparece la primera vez que se abre «Nueva huella» (HU2). Muestra en tres pasos una huella de ejemplo y se puede omitir en cualquier momento.",
      },
    },
  },
  args: { onDone: fn(), className: "mx-auto max-w-lg" },
} satisfies Meta<typeof GuidedExample>

export default meta
type Story = StoryObj<typeof meta>

export const Claro: Story = {}

export const Oscuro: Story = { globals: { theme: "dark" } }

export const MovimientoReducido: Story = { name: "Movimiento reducido", globals: { motion: "reduce" } }
