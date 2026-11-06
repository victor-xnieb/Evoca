import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { SuggestionCard } from "./SuggestionCard"

const meta = {
  title: "Evoca/SuggestionCard",
  component: SuggestionCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Sugerencia de emoción e intensidad hecha por la IA a partir de la nota (HU8). Es una propuesta: se usa con un toque y se puede cambiar; se guarda lo que elige la persona. Entra con una animación breve que respeta el movimiento reducido.",
      },
    },
  },
  args: {
    suggestion: { emotion: "nostalgia", emotionLabel: "Nostalgia", intensity: 4 },
    onAccept: fn(),
  },
  decorators: [(Story) => <div className="max-w-lg">{Story()}</div>],
} satisfies Meta<typeof SuggestionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Sugerencia: Story = {}

export const EnUso: Story = { name: "Sugerencia en uso", args: { applied: true } }

export const Leyendo: Story = { name: "La IA está leyendo", args: { suggestion: null, loading: true } }

export const SinSugerencia: Story = { name: "Sin sugerencia (no se muestra)", args: { suggestion: null } }
