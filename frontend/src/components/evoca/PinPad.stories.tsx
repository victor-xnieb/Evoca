import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

import { PinPad } from "./PinPad"

const meta = {
  title: "Evoca/PinPad",
  component: PinPad,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Teclado del PIN de 4 dígitos (táctil y teclado físico). Tiembla suavemente al fallar y, durante un bloqueo, muestra una cuenta regresiva visual. El botón de huella o rostro aparece solo si la persona lo activó.",
      },
    },
  },
  args: { onComplete: fn(), description: "Para proteger tus recuerdos." },
} satisfies Meta<typeof PinPad>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const ConBiometria: Story = { name: "Con huella o rostro", args: { onBiometric: fn() } }

export const Error: Story = {
  args: { error: "Ese PIN no coincide. Te quedan 3 intentos.", errorKey: 1 },
}

function LockedDemo() {
  const [lockedUntil] = useState(() => new Date(Date.now() + 4 * 60 * 1000 + 30 * 1000))
  return <PinPad onComplete={() => {}} lockedUntil={lockedUntil} description="Para proteger tus recuerdos." />
}

export const Bloqueado: Story = { render: () => <LockedDemo /> }

export const Cargando: Story = { args: { busy: true } }

function InteractiveDemo() {
  const [state, setState] = useState({ error: null as string | null, errorKey: 0, ok: false })
  if (state.ok) return <p className="text-center text-xl font-semibold">¡Qué bueno verte de nuevo!</p>
  return (
    <PinPad
      description="Pista para la demostración: 2580."
      error={state.error}
      errorKey={state.errorKey}
      onComplete={(pin) =>
        pin === "2580"
          ? setState({ ...state, ok: true })
          : setState({ ok: false, error: "Ese PIN no coincide. Inténtalo de nuevo.", errorKey: state.errorKey + 1 })
      }
    />
  )
}

/** Simula la verificación: el PIN correcto es 2580; prueba fallar para ver el temblor. */
export const Interactivo: Story = { render: () => <InteractiveDemo /> }
