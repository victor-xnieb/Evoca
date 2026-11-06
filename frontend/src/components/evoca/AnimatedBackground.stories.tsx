import type { Meta, StoryObj } from "@storybook/react-vite"

import { AnimatedBackground } from "./AnimatedBackground"

const meta = {
  title: "Evoca/AnimatedBackground",
  component: AnimatedBackground,
  parameters: {
    docs: {
      // Cada historia en su propio marco: el fondo es fijo y ocuparía toda la página de docs.
      story: { inline: false, height: "460px" },
      description: {
        component:
          'Fondo vivo de la app (lo monta AppShell detrás de todo). Elige el video por tema y orientación, muestra primero una imagen fija y monta el video cuando el navegador está ocioso. Con movimiento reducido, ahorro de datos o `variant="static"` se queda en la imagen fija. Cambia el tema y el movimiento desde la barra superior. Nada de texto directo encima: el contenido va en tarjetas casi opacas.',
      },
    },
  },
  args: { variant: "animated", orientation: "landscape" },
  argTypes: {
    variant: { control: "inline-radio", options: ["animated", "static"] },
    orientation: { control: "inline-radio", options: ["portrait", "landscape"] },
  },
  decorators: [
    (Story) => (
      <div className="relative isolate -m-6 grid min-h-dvh place-items-center p-6">
        <Story />
        <div className="max-w-sm rounded-3xl border bg-card/92 p-6 shadow-soft backdrop-blur-sm">
          <h2 className="text-2xl font-semibold">Tarjeta sobre el fondo</h2>
          <p className="mt-2 text-muted-foreground">
            El texto siempre va sobre una superficie casi opaca para conservar el contraste.
          </p>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AnimatedBackground>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {}

export const Vertical: Story = { args: { orientation: "portrait" } }

export const Oscuro: Story = { globals: { theme: "dark" } }

export const Estatico: Story = { name: "Estático (pantalla calmada)", args: { variant: "static" } }

export const MovimientoReducido: Story = { name: "Movimiento reducido", globals: { motion: "reduce" } }
