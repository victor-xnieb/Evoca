import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { emotionLabel, SAMPLE_SUGGESTION, sensoryLabel } from "@/mocks/fixtures"

import { MemorySuggestionCard } from "./MemorySuggestionCard"

const meta = {
  title: "Evoca/MemorySuggestionCard",
  component: MemorySuggestionCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Un recuerdo que propuso la IA (HU9): nombre, por qué agrupó esas huellas y la lista de huellas. La persona lo acepta (pasa al mapa), lo renombra, separa huellas o lo descarta. Nada se guarda en el mapa hasta que lo acepta.",
      },
    },
  },
  args: {
    suggestion: SAMPLE_SUGGESTION,
    sensoryLabel,
    emotionLabel,
    onAccept: fn(),
    onRename: fn(),
    onRemoveTrace: fn(),
    onDiscard: fn(),
    onOpenTrace: fn(),
  },
  decorators: [(Story) => <div className="mx-auto max-w-xl">{Story()}</div>],
} satisfies Meta<typeof MemorySuggestionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Guardando: Story = { args: { busy: true } }

export const ConError: Story = { name: "Con error", args: { error: "No pudimos guardar el cambio. Inténtalo de nuevo." } }

export const UnaHuella: Story = {
  name: "Una sola huella (no se puede separar)",
  args: { suggestion: { ...SAMPLE_SUGGESTION, name: "El café de la mañana", trace_count: 1, traces: SAMPLE_SUGGESTION.traces.slice(0, 1) } },
}
