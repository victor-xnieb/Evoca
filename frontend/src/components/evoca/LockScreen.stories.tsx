import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { LockScreen } from "./LockScreen"

const meta = {
  title: "Evoca/LockScreen",
  component: LockScreen,
  parameters: {
    docs: {
      story: { inline: false, height: "760px" },
      description: {
        component:
          "Pantalla de bloqueo de HU1: aparece al abrir la app o al volver desde segundo plano si hay un PIN activo. Tras 5 intentos fallidos el servidor bloquea el acceso 5 minutos y se muestra la cuenta regresiva.",
      },
    },
  },
  args: { name: "Ana", onComplete: fn(), onForgot: fn() },
  decorators: [(Story) => <div className="-m-6">{Story()}</div>],
} satisfies Meta<typeof LockScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const ConHuella: Story = { name: "Con huella o rostro", args: { onBiometric: fn() } }

export const PinIncorrecto: Story = {
  name: "PIN incorrecto",
  args: { error: "PIN incorrecto. Te quedan 3 intentos.", errorKey: 1 },
}

export const Bloqueada: Story = {
  name: "Bloqueada 5 minutos",
  args: { lockedUntil: new Date(Date.now() + 5 * 60 * 1000) },
}

export const Oscuro: Story = { globals: { theme: "dark" } }
