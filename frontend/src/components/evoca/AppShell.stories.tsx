import type { Meta, StoryObj } from "@storybook/react-vite"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { EMOTION_OPTIONS } from "@/mocks/fixtures"

import { AppShell } from "./AppShell"
import { EmptyState } from "./EmptyState"
import { PageTransition } from "./PageTransition"

const meta = {
  title: "Evoca/AppShell",
  component: AppShell,
  parameters: {
    docs: {
      description: {
        component:
          "Estructura de las pantallas principales: encabezado con marca y cambio de tema, fondo con degradado de la última emoción registrada y navegación inferior con indicador animado.",
      },
    },
  },
  args: { accentEmotion: "calma", children: null },
  argTypes: {
    accentEmotion: { control: "select", options: EMOTION_OPTIONS.map((option) => option.value) },
  },
  decorators: [(Story) => <div className="-m-6">{Story()}</div>],
  render: (args) => (
    <AppShell {...args}>
      <PageTransition className="gap-6">
        <h1 className="text-3xl font-semibold">Inicio</h1>
        <div className="rounded-3xl border bg-card/92 backdrop-blur-sm">
          <EmptyState
            title="Aún no tienes huellas"
            description="Cuando registres la primera, aquí verás tus recuerdos."
            action={
              <Button asChild className="h-11 rounded-full px-5">
                <Link to="/nueva-huella">Registrar mi primera huella</Link>
              </Button>
            }
          />
        </div>
      </PageTransition>
    </AppShell>
  ),
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

export const Calma: Story = {}

export const Alegria: Story = { name: "Alegría", args: { accentEmotion: "alegria" } }

export const Tristeza: Story = { args: { accentEmotion: "tristeza" } }

export const SinEmocion: Story = { name: "Sin emoción reciente", args: { accentEmotion: null } }
