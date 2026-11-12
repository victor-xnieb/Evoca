import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { emotionLabel, SAMPLE_MEMORIES } from "@/mocks/fixtures"

import { MemorySphere } from "./MemorySphere"

const [calm] = SAMPLE_MEMORIES

const meta = {
  title: "Evoca/MemorySphere",
  component: MemorySphere,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Un recuerdo en el mapa (HU10): esfera del color de su emoción dominante y del tamaño de sus huellas, con su nombre debajo. El ícono de la emoción y el nombre accesible acompañan al color.",
      },
    },
  },
  args: { memory: calm, emotionLabel: emotionLabel(calm.emotion), onOpen: fn() },
} satisfies Meta<typeof MemorySphere>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Flotando: Story = { args: { animated: true } }

export const UnaHuella: Story = {
  name: "Una sola huella",
  args: { memory: SAMPLE_MEMORIES[6], emotionLabel: emotionLabel(SAMPLE_MEMORIES[6].emotion) },
}

export const NombreLargo: Story = {
  name: "Nombre largo",
  args: { memory: { ...calm, name: "Las tardes de lluvia en la finca de los abuelos" } },
}
