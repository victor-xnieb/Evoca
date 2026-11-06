import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/ui/button"

import { EmptyState } from "./EmptyState"

const meta = {
  title: "Evoca/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Estado vacío o de error con tono cálido y una acción clara. La variante vacía lleva una ilustración Lottie propia (cargada bajo demanda); la de error es sobria y ofrece reintentar.",
      },
    },
  },
  args: {
    title: "Aún no tienes huellas",
    description: "Cuando registres la primera, aquí verás tus recuerdos más recientes.",
    action: <Button className="h-11 rounded-full px-5">Registrar mi primera huella</Button>,
  },
  decorators: [(Story) => <div className="max-w-lg rounded-3xl border bg-card/80">{Story()}</div>],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Vacio: Story = { name: "Vacío" }

export const Florecer: Story = {
  name: "Ilustración «florecer»",
  args: { illustration: "bloom", title: "Muy pronto", description: "Esta sección llega en la próxima entrega." },
}

export const Compacto: Story = { args: { compact: true, action: undefined } }

export const Error: Story = {
  args: {
    variant: "error",
    title: "No pudimos cargar tus huellas",
    description: "Revisa tu conexión e inténtalo de nuevo.",
    action: <Button variant="outline" className="h-11 rounded-full px-5">Intentar de nuevo</Button>,
  },
}
