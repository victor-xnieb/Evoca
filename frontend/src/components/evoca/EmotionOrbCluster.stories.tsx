import type { Meta, StoryObj } from "@storybook/react-vite"

import { EmotionOrbCluster } from "./EmotionOrbCluster"

const meta = {
  title: "Evoca/EmotionOrbCluster",
  component: EmotionOrbCluster,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Cinco esferas (alegría, calma, gratitud, nostalgia y tristeza) con la composición de la ilustración «orbes». Se usa en la tarjeta «Aún no tienes huellas» de Inicio. Decorativo.",
      },
    },
  },
  args: { size: 160, animated: true },
} satisfies Meta<typeof EmotionOrbCluster>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Grande: Story = { args: { size: 240 } }

export const SinAnimar: Story = { name: "Sin animar", args: { animated: false } }
