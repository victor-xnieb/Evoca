import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { EMOTION_SLUGS } from "@/lib/emotions"
import { emotionLabel } from "@/mocks/fixtures"

import { DayCell } from "./DayCell"

const meta = {
  title: "Evoca/DayCell",
  component: DayCell,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Día del calendario de ánimo. Con registros toma el color de la emoción dominante y muestra su ícono; sin registros es beige neutro, sin alertas. Los días entran en «olas» de color según su posición.",
      },
    },
  },
  args: { date: new Date(2026, 10, 5), onSelect: fn() },
  decorators: [(Story) => <div className="w-16">{Story()}</div>],
} satisfies Meta<typeof DayCell>

export default meta
type Story = StoryObj<typeof meta>

export const ConEmocion: Story = {
  name: "Con emoción",
  args: { emotion: "calma", emotionLabel: "Calma", averageIntensity: 3.4 },
}

export const SinRegistros: Story = { name: "Sin registros (neutro)" }

export const Seleccionado: Story = {
  args: { emotion: "gratitud", emotionLabel: "Gratitud", averageIntensity: 4, selected: true },
}

export const Hoy: Story = { args: { emotion: "alegria", emotionLabel: "Alegría", isToday: true } }

export const FueraDelMes: Story = { name: "Fuera del mes", args: { outsideMonth: true } }

export const NoInteractivo: Story = {
  name: "Deshabilitado",
  args: { emotion: "tristeza", emotionLabel: "Tristeza", onSelect: undefined },
}

function MonthDemo() {
  const [selected, setSelected] = useState<number | null>(null)
  const firstWeekday = (new Date(2026, 10, 1).getDay() + 6) % 7
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
        <span key={index} className="text-center text-xs font-semibold text-muted-foreground" aria-hidden="true">
          {day}
        </span>
      ))}
      {Array.from({ length: firstWeekday }, (_, index) => (
        <span key={`vacío-${index}`} />
      ))}
      {Array.from({ length: 30 }, (_, index) => {
        const day = index + 1
        const position = firstWeekday + index
        const emotion = day % 4 === 0 ? null : EMOTION_SLUGS[(day * 3) % EMOTION_SLUGS.length]
        return (
          <DayCell
            key={day}
            date={new Date(2026, 10, day)}
            emotion={emotion}
            emotionLabel={emotion ? emotionLabel(emotion) : undefined}
            averageIntensity={emotion ? ((day % 5) + 1) * 0.9 : null}
            isToday={day === 5}
            selected={selected === day}
            wave={{ row: Math.floor(position / 7), column: position % 7 }}
            onSelect={() => setSelected(day)}
          />
        )
      })}
    </div>
  )
}

/** Un mes de ejemplo para ver las olas de color y el contraste de toda la paleta. */
export const MesDeEjemplo: Story = {
  name: "Mes de ejemplo",
  decorators: [(Story) => <div className="w-full max-w-md">{Story()}</div>],
  render: () => <MonthDemo />,
}
