import type { Meta, StoryObj } from "@storybook/react-vite"

import { Envelope } from "./Envelope"

import "@/styles/diary.css"

const meta = {
  title: "Evoca/Envelope",
  component: Envelope,
  parameters: {
    docs: {
      description: {
        component:
          "El sobre de una carta a mi yo del futuro (HU19), con su sello de cera. Es solo la imagen (aria-hidden): la pantalla dice con texto si está sellada y cuándo se abre. Con «reducir movimiento», la solapa y el sello cambian sin girar ni caer.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: { state: "sealed" },
} satisfies Meta<typeof Envelope>

export default meta
type Story = StoryObj<typeof meta>

export const Sellado: Story = {}

export const ListoParaAbrir: Story = { name: "Listo para abrir", args: { state: "ready" } }

export const Abierto: Story = { args: { state: "open" } }

export const AlSellar: Story = { name: "Al sellar (animación)", args: { state: "sealed", stamp: true } }
