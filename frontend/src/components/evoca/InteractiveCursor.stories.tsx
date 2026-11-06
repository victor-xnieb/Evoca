import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { EmotionOrb } from "./EmotionOrb"
import { GlassCard } from "./GlassCard"
import { InteractiveCursor } from "./InteractiveCursor"

const meta = {
  title: "Evoca/InteractiveCursor",
  component: InteractiveCursor,
  parameters: {
    docs: {
      story: { inline: false, height: "520px" },
      description: {
        component:
          "Seguidor decorativo del mouse (se monta una vez en AppShell). El cursor del sistema sigue visible. Sobre tarjetas y enlaces el anillo crece y toma el color de acento (`--cursor-accent`); con `data-cursor-label` muestra una etiqueta; sobre texto y campos desaparece; sobre una esfera se vuelve grande y cálido. No existe en pantallas táctiles ni con movimiento reducido.",
      },
    },
  },
  render: () => (
    <div className="grid gap-6 p-4">
      <InteractiveCursor />
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard accent="calma" className="p-5">
          <h2 className="font-semibold">Tarjeta calma</h2>
          <p className="text-sm text-muted-foreground">El anillo se vuelve una burbuja verde agua.</p>
        </GlassCard>
        <GlassCard accent="alegria" cursorLabel="Ver" to="/" className="p-5">
          <span className="block font-semibold">Tarjeta con etiqueta</span>
          <span className="block text-sm text-muted-foreground">data-cursor-label=&quot;Ver&quot;</span>
        </GlassCard>
        <GlassCard accent="tristeza" className="grid place-items-center p-5">
          <EmotionOrb emotion="tristeza" size={96} animated decorative />
        </GlassCard>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-card/92 p-5">
        <Button className="h-11 rounded-full px-5" data-cursor-label="Registrar">
          Registrar
        </Button>
        <Input aria-label="Campo de texto" placeholder="Aquí el cursor desaparece" className="h-11 max-w-xs" />
        <p className="text-sm text-muted-foreground">Sobre el texto se hace discreto para no estorbar.</p>
      </div>
    </div>
  ),
} satisfies Meta<typeof InteractiveCursor>

export default meta
type Story = StoryObj<typeof meta>

export const Demostracion: Story = { name: "Demostración" }

export const Oscuro: Story = { globals: { theme: "dark" } }
