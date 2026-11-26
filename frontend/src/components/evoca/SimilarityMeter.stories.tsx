import type { Meta, StoryObj } from "@storybook/react-vite"

import { SimilarityMeter } from "./SimilarityMeter"

const meta = {
  title: "Evoca/SimilarityMeter",
  component: SimilarityMeter,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Qué tan parecida es una huella a lo que se buscó por significado (HU12): tres barras y su nombre. Si la IA no está disponible y se buscó por palabras, dice cuántas palabras coinciden.",
      },
    },
  },
  args: { level: "high", mode: "meaning" },
} satisfies Meta<typeof SimilarityMeter>

export default meta
type Story = StoryObj<typeof meta>

export const MuyParecida: Story = { name: "Muy parecida" }

export const Parecida: Story = { args: { level: "medium" } }

export const AlgoParecida: Story = { name: "Algo parecida", args: { level: "low" } }

export const PorPalabras: Story = { name: "Búsqueda por palabras", args: { level: "medium", mode: "words" } }
