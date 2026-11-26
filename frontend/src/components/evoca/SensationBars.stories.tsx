import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { SAMPLE_SENSATION_STATS } from "@/mocks/fixtures"

import { SensationBars } from "./SensationBars"

const meta = {
  title: "Evoca/SensationBars",
  component: SensationBars,
  parameters: {
    docs: {
      description: {
        component:
          "Cuántas huellas registra la persona de cada tipo (HU13). La gráfica de barras es solo visual; cada tipo es además un botón con su nombre y su número que abre el detalle.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  args: { types: SAMPLE_SENSATION_STATS.types, selected: null, onSelect: fn() },
} satisfies Meta<typeof SensationBars>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveBars(args: Parameters<typeof SensationBars>[0]) {
  const [selected, setSelected] = useState<string | null>(null)
  return <SensationBars {...args} selected={selected} onSelect={(type) => setSelected((value) => (value === type ? null : type))} />
}

export const Interactiva: Story = { render: (args) => <InteractiveBars {...args} /> }

export const ConUnTipoAbierto: Story = { name: "Con un tipo abierto", args: { selected: "song" } }

export const SoloUnTipo: Story = {
  name: "Solo un tipo registrado",
  args: {
    types: SAMPLE_SENSATION_STATS.types.map((item) => ({ ...item, count: item.type === "aroma" ? 12 : 0 })),
  },
}
