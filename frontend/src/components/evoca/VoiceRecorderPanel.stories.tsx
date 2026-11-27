import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { VoiceRecorderPanel } from "./VoiceRecorderPanel"

// Un audio vacío de muestra para el reproductor (sin pedir el micrófono en Storybook).
const SAMPLE_URL = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

const meta = {
  title: "Evoca/VoiceRecorderPanel",
  component: VoiceRecorderPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Grabadora de la nota de voz en «Nueva huella» (HU16): hasta 60 segundos, se escucha antes de guardar y, sin permiso para el micrófono, explica por qué lo necesita y ofrece escribir la nota.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  args: { state: { status: "idle" }, onStart: fn(), onStop: fn(), onDiscard: fn(), onWriteInstead: fn() },
} satisfies Meta<typeof VoiceRecorderPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Lista: Story = {}

export const Grabando: Story = { args: { state: { status: "recording", seconds: 23 } } }

export const Grabada: Story = {
  args: { state: { status: "recorded", recording: { blob: new Blob(), duration: 42 }, url: SAMPLE_URL } },
}

export const SinPermiso: Story = { name: "Sin permiso del micrófono", args: { state: { status: "denied" } } }

export const SinMicrofono: Story = {
  name: "Sin micrófono",
  args: { state: { status: "error", message: "No encontramos un micrófono en este dispositivo. Puedes escribir la nota." } },
}

export const NavegadorSinGrabacion: Story = { name: "Navegador sin grabación", args: { state: { status: "unsupported" } } }
