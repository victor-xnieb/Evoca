import type { Meta, StoryObj } from "@storybook/react-vite"

import { AuroraText } from "./AuroraText"
import { EvocaLoader } from "./EvocaLoader"
import { Ripple } from "./Ripple"
import { ThemeSwitch } from "./ThemeSwitch"

/**
 * Piezas adaptadas de fuentes externas con licencia MIT (ver CREDITS.md). Todas usan
 * los tokens de Evoca para que se vean como parte de la misma familia.
 */
const meta = {
  title: "Externos/Piezas adaptadas",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "AuroraText y Ripple vienen de Magic UI; EvocaLoader y ThemeSwitch, de Uiverse.io. Todos fueron adaptados a la paleta y a las reglas de animación de Evoca (solo opacidad y transformaciones).",
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const TextoAurora: Story = {
  name: "AuroraText (Magic UI)",
  render: () => (
    <h1 className="font-display text-7xl font-semibold">
      <AuroraText>Evoca</AuroraText>
    </h1>
  ),
}

export const Ondas: Story = {
  name: "Ripple (Magic UI)",
  render: () => (
    <div className="relative h-80 overflow-hidden rounded-3xl border bg-card">
      <Ripple />
    </div>
  ),
}

export const Cargador: Story = {
  name: "EvocaLoader (Uiverse)",
  render: () => (
    <div className="flex items-center gap-8">
      <EvocaLoader />
      <EvocaLoader size="sm" label="Guardando…" />
    </div>
  ),
}

export const InterruptorDeTema: Story = {
  name: "ThemeSwitch (Uiverse)",
  render: () => (
    <div className="flex items-center gap-3">
      <ThemeSwitch />
      <span className="text-sm text-muted-foreground">Cambia el tema dentro de esta historia.</span>
    </div>
  ),
}
