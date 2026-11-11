import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { EMOTION_SLUGS } from "@/lib/emotions"
import { emotionLabel, SAMPLE_MEMORIES } from "@/mocks/fixtures"

import { MemoryMap, MemoryMapSkeleton } from "./MemoryMap"

const meta = {
  title: "Evoca/MemoryMap",
  component: MemoryMap,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Mapa de recuerdos (HU10): esferas sin orden cronológico (mezcla estable según el id), del color de su emoción y del tamaño de sus huellas. Solo las primeras 12 flotan y, con muchas, las que están fuera de la pantalla no se pintan hasta verse.",
      },
    },
  },
  args: { memories: SAMPLE_MEMORIES, emotionLabel, onOpen: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof MemoryMap>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Doscientos: Story = {
  name: "200 recuerdos",
  args: {
    memories: Array.from({ length: 200 }, (_, index) => ({
      id: `m-${index}`,
      name: `Recuerdo ${index + 1}`,
      explanation: "",
      emotion: EMOTION_SLUGS[index % EMOTION_SLUGS.length],
      trace_count: (index % 9) + 1,
      sensory_types: ["aroma"],
    })),
  },
}

export const Cargando: Story = { render: () => <MemoryMapSkeleton /> }
