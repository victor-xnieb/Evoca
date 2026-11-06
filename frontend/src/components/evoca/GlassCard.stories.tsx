import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"
import { fn } from "storybook/test"

import { EMOTION_SLUGS } from "@/lib/emotions"

import { EmotionOrbCluster } from "./EmotionOrbCluster"
import { GlassCard } from "./GlassCard"

/** Fondo con manchas de color para que se note la transparencia y el desenfoque. */
function ColorField({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate -m-6 grid min-h-[28rem] place-items-center overflow-hidden p-10">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute top-6 left-[12%] size-48 rounded-full bg-emotion-gratitud" />
        <div className="absolute right-[14%] bottom-4 size-56 rounded-full bg-emotion-calma" />
        <div className="absolute top-[40%] left-[45%] size-32 rounded-full bg-emotion-alegria" />
      </div>
      {children}
    </div>
  )
}

/** Controles de la historia (GlassCard tiene props en unión: enlace, botón o contenedor). */
interface GlassCardStoryArgs {
  accent: string
  cursorLabel?: string
}

const meta = {
  title: "Evoca/GlassCard",
  // Sin `component`: las props en unión (enlace, botón, contenedor) no caben en un solo control.
  parameters: {
    docs: {
      description: {
        component:
          "Tarjeta de vidrio, base de todas las tarjetas de Evoca. Con mouse: se eleva, un foco de luz sigue al puntero, se inclina hasta ±5° (resorte de Motion), el borde se ilumina con el acento y lo marcado con `.evoca-parallax` se mueve en sentido contrario. En táctil: hundimiento y destello al tocar. Con movimiento reducido solo cambia el borde. Con `to` es un enlace y con `onClick` un botón.",
      },
    },
  },
  args: { accent: "calma" },
  argTypes: { accent: { control: "select", options: EMOTION_SLUGS } },
  decorators: [(Story) => <ColorField>{Story()}</ColorField>],
  render: (args) => (
    <GlassCard {...args} className="w-80 p-6">
      <h2 className="text-xl font-semibold">Tarjeta de vidrio</h2>
      <p className="mt-2 text-muted-foreground">Pasa el mouse: la tarjeta se inclina y la luz sigue al puntero.</p>
    </GlassCard>
  ),
} satisfies Meta<GlassCardStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Claro: Story = {}

export const Oscuro: Story = { globals: { theme: "dark" } }

export const Acentos: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {(["calma", "alegria", "tristeza"] as const).map((accent) => (
        <GlassCard key={accent} accent={accent} className="w-56 p-5">
          <span
            className="evoca-parallax mb-3 block size-10 rounded-xl"
            style={{ background: `color-mix(in oklab, var(--emotion-${accent}) 30%, transparent)` }}
          />
          <h2 className="font-semibold">Acento {accent}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Borde y luz con el color de la emoción.</p>
        </GlassCard>
      ))}
    </div>
  ),
}

export const ConEsferas: Story = {
  name: "Con esferas (se separan al entrar)",
  render: (args) => (
    <GlassCard {...args} className="grid w-80 place-items-center p-8">
      <div className="evoca-parallax">
        <EmotionOrbCluster />
      </div>
      <h2 className="mt-3 text-xl font-semibold">Aún no tienes huellas</h2>
    </GlassCard>
  ),
}

export const ClicableBoton: Story = {
  name: "Clicable (botón)",
  args: { cursorLabel: "Ver", accent: "gratitud" },
  render: (args) => (
    <GlassCard {...args} onClick={fn()} className="w-72 p-6 text-left">
      <span className="block text-lg font-semibold">Ver mis huellas</span>
      <span className="mt-1 block text-sm text-muted-foreground">Se puede usar con Tab y Enter.</span>
    </GlassCard>
  ),
}

export const MovimientoReducido: Story = { name: "Movimiento reducido", globals: { motion: "reduce" } }
