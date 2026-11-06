import type { Meta, StoryObj } from "@storybook/react-vite"

import { LottieIllustration } from "./LottieIllustration"

const meta = {
  title: "Evoca/LottieIllustration",
  component: LottieIllustration,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Ilustraciones animadas con Lottie, generadas en código desde los tokens de color (cambian con la paleta y con el tema). El reproductor se carga bajo demanda. Con movimiento reducido se muestran quietas.",
      },
    },
  },
  args: { name: "orbs" },
  argTypes: { name: { control: "inline-radio", options: ["orbs", "bloom"] } },
} satisfies Meta<typeof LottieIllustration>

export default meta
type Story = StoryObj<typeof meta>

export const Orbes: Story = { args: { name: "orbs", className: "w-56" } }

export const Florecer: Story = { args: { name: "bloom", className: "w-56", label: "Flor de emociones que se abre" } }
