import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { EMOTION_SLUGS } from "@/lib/emotions"
import type { MemoryEdge, MemoryNode } from "@/lib/memories"
import { emotionLabel, SAMPLE_MEMORIES, SAMPLE_MEMORY_EDGES } from "@/mocks/fixtures"

import { MemoryGraph, MemoryGraphSkeleton } from "./MemoryGraph"

/** El grafo guarda la esfera elegida en quien lo usa: aquí, un estado local. */
function Interactive({ nodes, edges }: { nodes: MemoryNode[]; edges: MemoryEdge[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <MemoryGraph
      nodes={nodes}
      edges={edges}
      emotionLabel={emotionLabel}
      selectedId={selectedId}
      onSelect={setSelectedId}
      className="h-[560px]"
    />
  )
}

const meta = {
  title: "Evoca/MemoryGraph",
  component: Interactive,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Mapa de recuerdos como grafo (HU10). Cada esfera es un recuerdo (color = emoción dominante, tamaño = huellas) y las líneas unen los afines: más afinidad, línea más gruesa y opaca. La disposición es una simulación de fuerzas propia y determinística. Arrastra el fondo para moverte, pellizca o usa Ctrl + rueda para acercar, arrastra una esfera para moverla, toca una línea para ver su motivo y toca una esfera para resaltar sus conexiones.",
      },
    },
  },
  args: { nodes: SAMPLE_MEMORIES, edges: SAMPLE_MEMORY_EDGES },
  decorators: [(Story) => <div className="mx-auto max-w-3xl">{Story()}</div>],
} satisfies Meta<typeof Interactive>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Filtrado: Story = {
  name: "Con filtro (solo alegría)",
  args: {
    nodes: SAMPLE_MEMORIES.map((memory) => ({ ...memory, match: memory.emotion === "alegria" })),
    edges: SAMPLE_MEMORY_EDGES.filter((edge) => edge.source === "m-3" && edge.target === "m-5"),
  },
}

const MANY: MemoryNode[] = Array.from({ length: 200 }, (_, index) => ({
  id: `m-${index}`,
  name: `Recuerdo ${index + 1}`,
  explanation: "",
  emotion: EMOTION_SLUGS[index % EMOTION_SLUGS.length],
  trace_count: (index % 9) + 1,
  sensory_types: ["aroma"],
  match: true,
}))

export const Doscientos: Story = {
  name: "200 recuerdos",
  args: {
    nodes: MANY,
    edges: Array.from({ length: 260 }, (_, index) => ({
      source: `m-${index % 200}`,
      target: `m-${(index * 7 + 3) % 200}`,
      score: 0.4 + (index % 6) / 10,
      reason: "Comparten aromas",
    })).filter((edge) => edge.source !== edge.target),
  },
}

export const Cargando: Story = { render: () => <MemoryGraphSkeleton className="h-[560px]" /> }
