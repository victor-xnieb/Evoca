import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { EMOTION_OPTIONS } from "@/mocks/fixtures"

import { EmotionPicker } from "./EmotionPicker"

const meta = {
  title: "Evoca/EmotionPicker",
  component: EmotionPicker,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Selector de las 8 emociones como un conjunto de esferas (HU2). Selección única con flechas o un toque; cada opción lleva su esfera, su color y su nombre.",
      },
    },
  },
  args: { options: EMOTION_OPTIONS, value: null, onChange: fn() },
} satisfies Meta<typeof EmotionPicker>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveDemo() {
  const [value, setValue] = useState<string | null>("nostalgia")
  return <EmotionPicker options={EMOTION_OPTIONS} value={value} onChange={setValue} />
}

export const Interactivo: Story = { render: () => <InteractiveDemo /> }

export const SinElegir: Story = { name: "Sin elegir" }

export const ConError: Story = {
  name: "Falta elegir",
  args: { error: "Elige la emoción que sentiste." },
}

export const Oscuro: Story = { globals: { theme: "dark" }, render: () => <InteractiveDemo /> }
