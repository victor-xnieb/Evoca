import type { Meta, StoryObj } from "@storybook/react-vite"
import { AnimatePresence } from "motion/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { PageTransition } from "./PageTransition"

const meta = {
  title: "Evoca/PageTransition",
  component: PageTransition,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Transición entre pantallas: desplazamiento corto + fundido al entrar y salir, para entender que cambió la sección. Con movimiento reducido solo funde.",
      },
    },
  },
  args: { children: null },
} satisfies Meta<typeof PageTransition>

export default meta
type Story = StoryObj<typeof meta>

const SCREENS = ["Inicio", "Mis huellas", "Ánimo"]

function ScreensDemo() {
  const [index, setIndex] = useState(0)
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Button className="self-start rounded-full" onClick={() => setIndex((index + 1) % SCREENS.length)}>
        Ir a «{SCREENS[(index + 1) % SCREENS.length]}»
      </Button>
      <AnimatePresence mode="wait">
        <PageTransition key={SCREENS[index]} className="gap-2 rounded-3xl border bg-card p-6 shadow-soft">
          <h2 className="text-2xl font-semibold">{SCREENS[index]}</h2>
          <p className="text-muted-foreground">Contenido de ejemplo de la pantalla.</p>
        </PageTransition>
      </AnimatePresence>
    </div>
  )
}

export const EntrePantallas: Story = { name: "Entre pantallas", render: () => <ScreensDemo /> }
