import type { Meta, StoryObj } from "@storybook/react-vite"

import { EvocaWordmark } from "./EvocaWordmark"

const meta = {
  title: "Evoca/EvocaWordmark",
  component: EvocaWordmark,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Marca «evoca.» del hero de Inicio (el encabezado ya no la repite). La palabra toma el color del texto del tema; el punto pasa por los colores de las ocho emociones. Con movimiento reducido queda en calma.",
      },
    },
  },
  args: { className: "text-7xl" },
} satisfies Meta<typeof EvocaWordmark>

export default meta
type Story = StoryObj<typeof meta>

export const Claro: Story = {}

export const Oscuro: Story = { globals: { theme: "dark" } }

export const MovimientoReducido: Story = { name: "Movimiento reducido", globals: { motion: "reduce" } }
