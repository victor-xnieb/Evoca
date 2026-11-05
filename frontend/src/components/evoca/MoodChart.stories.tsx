import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Button } from "@/components/ui/button"
import { SAMPLE_MOOD_POINTS } from "@/mocks/fixtures"

import { MoodChart } from "./MoodChart"

const meta = {
  title: "Evoca/MoodChart",
  component: MoodChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Gráfica de ánimo con Recharts: un punto por registro real (color + ícono de su emoción), línea de promedio del periodo, resumen textual y tabla alternativa accesible. La línea se dibuja al cargar; con movimiento reducido aparece directamente.",
      },
    },
  },
  args: { points: SAMPLE_MOOD_POINTS, average: 3.3, periodLabel: "esta semana" },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof MoodChart>

export default meta
type Story = StoryObj<typeof meta>

export const ConRegistros: Story = { name: "Con registros" }

export const Cargando: Story = { args: { loading: true } }

export const Vacio: Story = {
  name: "Vacío",
  args: {
    points: [],
    average: null,
    periodLabel: "este mes",
    emptyAction: <Button className="h-11 rounded-full px-5">Registrar mi primera huella</Button>,
  },
}

export const Error: Story = {
  args: { points: [], average: null, error: "Revisa tu conexión e inténtalo de nuevo.", onRetry: fn() },
}
