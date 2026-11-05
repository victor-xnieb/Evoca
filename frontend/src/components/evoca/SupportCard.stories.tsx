import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { DRAFT_HELP_LINES } from "@/mocks/fixtures"

import { SupportCard } from "./SupportCard"

const meta = {
  title: "Evoca/SupportCard",
  component: SupportCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Orientación hacia ayuda profesional. Deliberadamente calmada: sin animaciones, sin rojo ni colores de alarma, sin diagnósticos. Los textos y líneas de ejemplo son BORRADORES pendientes de aprobación del psicólogo asesor (HU6).",
      },
    },
  },
  args: {
    title: "Queremos acompañarte",
    message:
      "Notamos que estos días se han sentido pesados. Hablar con una persona preparada puede ayudarte a ver las cosas con más calma.",
    lines: DRAFT_HELP_LINES,
    onDismiss: fn(),
    onOpenHelp: fn(),
    draft: true,
  },
  decorators: [(Story) => <div className="max-w-lg">{Story()}</div>],
} satisfies Meta<typeof SupportCard>

export default meta
type Story = StoryObj<typeof meta>

export const Orientacion: Story = { name: "Orientación (borrador)" }

export const SinCerrar: Story = { name: "Sin opción de cerrar", args: { onDismiss: undefined } }

export const SinLineas: Story = { name: "Sin líneas", args: { lines: [] } }
