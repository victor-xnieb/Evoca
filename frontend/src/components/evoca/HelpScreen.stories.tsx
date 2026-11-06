import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { DRAFT_HELP_LINES } from "@/mocks/fixtures"

import { HelpScreen } from "./HelpScreen"

const meta = {
  title: "Evoca/HelpScreen",
  component: HelpScreen,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Pantalla completa de ayuda inmediata (HU6 · escenario 2): se abre al escribir una palabra de riesgo, con las líneas oficiales listas para llamar. Sin animación, sin rojo ni lenguaje de diagnóstico. Los textos de ejemplo son BORRADORES pendientes de aprobación del psicólogo asesor.",
      },
    },
  },
  args: {
    open: true,
    title: "Puedes hablar con alguien ahora",
    message:
      "Lo que sientes importa. Si estás pasando por un momento muy difícil o piensas en hacerte daño, llama a una de estas líneas: te atienden personas preparadas para escucharte.",
    lines: DRAFT_HELP_LINES,
    onOpenLine: fn(),
    onClose: fn(),
    draft: true,
  },
} satisfies Meta<typeof HelpScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Borrador: Story = { name: "Contenido provisional" }

export const Aprobado: Story = { name: "Contenido aprobado", args: { draft: false } }
