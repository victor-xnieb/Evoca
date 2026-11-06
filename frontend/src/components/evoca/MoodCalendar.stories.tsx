import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { EMOTION_SLUGS } from "@/lib/emotions"
import { emotionLabel } from "@/mocks/fixtures"

import { MoodCalendar, type CalendarDay } from "./MoodCalendar"

const NOVEMBER = new Date(2026, 10, 1)

// Ejemplo: registros en dos de cada tres días de noviembre.
const DAYS: Record<string, CalendarDay> = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => index + 1)
    .filter((day) => day % 3 !== 0)
    .map((day) => {
      const emotion = EMOTION_SLUGS[(day * 5) % EMOTION_SLUGS.length]
      return [
        `2026-11-${String(day).padStart(2, "0")}`,
        { emotion, emotionLabel: emotionLabel(emotion), averageIntensity: ((day % 5) + 1) * 0.9, count: (day % 3) + 1 },
      ]
    }),
)

const meta = {
  title: "Evoca/MoodCalendar",
  component: MoodCalendar,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Calendario de ánimo (HU7): cada día con el color e ícono de su emoción dominante; los días sin registros en un tono neutro, sin alertas. Se puede ir a meses anteriores y tocar un día para ver su detalle.",
      },
    },
  },
  args: {
    month: NOVEMBER,
    days: DAYS,
    today: new Date(2026, 10, 20),
    onSelect: fn(),
    onPrevious: fn(),
    onNext: fn(),
    canGoNext: false,
    className: "max-w-md",
  },
} satisfies Meta<typeof MoodCalendar>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveDemo() {
  const [selected, setSelected] = useState<string | null>("2026-11-07")
  return (
    <MoodCalendar
      month={NOVEMBER}
      days={DAYS}
      today={new Date(2026, 10, 20)}
      selected={selected}
      onSelect={setSelected}
      canGoNext={false}
      onPrevious={() => {}}
      className="max-w-md"
    />
  )
}

export const Interactivo: Story = { render: () => <InteractiveDemo /> }

export const SinRegistros: Story = { name: "Mes sin registros (todo neutro)", args: { days: {} } }

export const Cargando: Story = { args: { loading: true } }

export const Oscuro: Story = { globals: { theme: "dark" } }
