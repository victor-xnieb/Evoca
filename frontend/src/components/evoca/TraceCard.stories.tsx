import type { Meta, StoryObj } from "@storybook/react-vite"
import { motion } from "motion/react"
import { fn } from "storybook/test"

import { emotionLabel, FIXED_NOW, SAMPLE_TRACES, sensoryLabel } from "@/mocks/fixtures"
import { riseIn, staggerContainer } from "@/lib/motion"

import { TraceCard, TraceCardSkeleton } from "./TraceCard"

const [first] = SAMPLE_TRACES

const meta = {
  title: "Evoca/TraceCard",
  component: TraceCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Tarjeta de una huella: tipo sensorial, nota, emoción (chip con color e ícono), intensidad, etiquetas y fecha relativa. Si es interactiva, se eleva al pasar el cursor.",
      },
    },
  },
  args: {
    trace: first,
    sensoryLabel: sensoryLabel(first.sensory_type),
    emotionLabel: emotionLabel(first.emotion),
    now: FIXED_NOW,
    onOpen: fn(),
  },
  decorators: [(Story) => <div className="max-w-md">{Story()}</div>],
} satisfies Meta<typeof TraceCard>

export default meta
type Story = StoryObj<typeof meta>

export const Interactiva: Story = {}

export const SoloLectura: Story = { name: "Solo lectura", args: { onOpen: undefined } }

export const SinEtiquetas: Story = {
  name: "Sin etiquetas",
  args: { trace: SAMPLE_TRACES[2], sensoryLabel: "Lugar", emotionLabel: "Calma" },
}

export const Cargando: Story = { render: () => <TraceCardSkeleton /> }

/** Lista con entrada escalonada, como se verá en «Mis huellas». */
export const Lista: Story = {
  render: () => (
    <motion.ul className="flex flex-col gap-3" variants={staggerContainer()} initial="hidden" animate="visible">
      {SAMPLE_TRACES.map((trace) => (
        <motion.li key={trace.id} variants={riseIn}>
          <TraceCard
            trace={trace}
            sensoryLabel={sensoryLabel(trace.sensory_type)}
            emotionLabel={emotionLabel(trace.emotion)}
            now={FIXED_NOW}
            onOpen={() => {}}
          />
        </motion.li>
      ))}
    </motion.ul>
  ),
}
