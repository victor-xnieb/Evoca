import type { Meta, StoryObj } from "@storybook/react-vite"

import { EMOTION_SLUGS } from "@/lib/emotions"

import { EmotionOrb } from "./EmotionOrb"

const meta = {
  title: "Evoca/EmotionOrb",
  component: EmotionOrb,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Esfera de una emoción (imagen del mapa central `lib/emotionOrbs.ts`), con resplandor del color del token. Con `animated` flota (8 a 14 px, deriva, giro de ±3° y respiración de escala, 5 a 9 s), se acerca al mouse cuando está cerca y rebota con una onda al tocarla. Es decoración: los chips, la gráfica y el calendario siguen usando los colores de los tokens. Con movimiento reducido queda quieta.",
      },
    },
  },
  args: { emotion: "calma", size: "md", animated: false },
  argTypes: {
    emotion: { control: "select", options: EMOTION_SLUGS },
    size: { control: "select", options: ["sm", "md", "lg", 220] },
  },
} satisfies Meta<typeof EmotionOrb>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const TodasLasEmociones: Story = {
  name: "Todas las emociones",
  render: (args) => (
    <div className="flex flex-wrap gap-4">
      {EMOTION_SLUGS.map((emotion) => (
        <figure key={emotion} className="flex flex-col items-center gap-1">
          <EmotionOrb {...args} emotion={emotion} decorative />
          <figcaption className="rounded-full bg-card/92 px-2 text-sm font-semibold">{emotion}</figcaption>
        </figure>
      ))}
    </div>
  ),
  args: { size: "lg" },
}

export const Tamanos: Story = {
  name: "Tamaños",
  render: (args) => (
    <div className="flex items-end gap-4">
      {(["sm", "md", "lg", 220] as const).map((size) => (
        <EmotionOrb key={size} {...args} size={size} />
      ))}
    </div>
  ),
  args: { emotion: "gratitud" },
}

export const Animada: Story = {
  name: "Animada (acerca el mouse o haz clic)",
  render: (args) => (
    <div className="flex gap-6 p-6">
      {EMOTION_SLUGS.slice(0, 5).map((emotion) => (
        <EmotionOrb key={emotion} {...args} emotion={emotion} />
      ))}
    </div>
  ),
  args: { animated: true },
}

export const SinAnimar: Story = { name: "Sin animar", args: { emotion: "alegria", size: "lg" } }

export const FondoOscuro: Story = {
  name: "Fondo oscuro (enojo con resplandor)",
  globals: { theme: "dark" },
  render: TodasLasEmociones.render,
  args: { size: "lg" },
}

export const MovimientoReducido: Story = {
  name: "Movimiento reducido",
  globals: { motion: "reduce" },
  render: Animada.render,
  args: { animated: true },
}
