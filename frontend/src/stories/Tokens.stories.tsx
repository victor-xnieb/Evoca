import type { Meta, StoryObj } from "@storybook/react-vite"

import { EMOTION_VISUALS } from "@/lib/emotions"
import { EMOTION_OPTIONS } from "@/mocks/fixtures"

/**
 * Fundamentos visuales de Evoca. Todos los valores salen de src/styles/tokens.css:
 * cambiar la paleta es tocar un solo archivo.
 */
const meta = {
  title: "Fundamentos/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PaletaDeEmociones: Story = {
  name: "Paleta de emociones",
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      {EMOTION_OPTIONS.map((option) => {
        const visual = EMOTION_VISUALS[option.value]
        return (
          <div
            key={option.value}
            className="flex aspect-[4/3] flex-col justify-between rounded-2xl p-4 shadow-soft"
            style={{ background: visual.color, color: visual.ink }}
          >
            <visual.icon aria-hidden="true" className="size-6" />
            <div>
              <p className={visual.bold ? "text-lg font-bold" : "text-lg font-semibold"}>{option.label}</p>
              <code className="text-xs opacity-80">--emotion-{option.value}</code>
            </div>
          </div>
        )
      })}
    </div>
  ),
}

const BASE = [
  ["--background", "Fondo"],
  ["--card", "Tarjeta"],
  ["--secondary", "Arena"],
  ["--foreground", "Texto"],
  ["--muted-foreground", "Texto suave"],
  ["--evoca-day-empty", "Día sin registro"],
  ["--evoca-support", "Apoyo (calmado)"],
  ["--ring", "Foco"],
] as const

export const Base: Story = {
  name: "Base cálida",
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      {BASE.map(([token, label]) => (
        <div key={token} className="overflow-hidden rounded-2xl border bg-card">
          <div className="h-16 border-b" style={{ background: `var(${token})` }} />
          <div className="p-3">
            <p className="font-semibold">{label}</p>
            <code className="text-xs text-muted-foreground">{token}</code>
          </div>
        </div>
      ))}
    </div>
  ),
}

export const Tipografia: Story = {
  name: "Tipografía",
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="font-display text-6xl font-semibold">Fraunces</p>
      <p className="font-display text-3xl">El olor del café en casa de la abuela</p>
      <p className="text-lg">
        Figtree para el texto: legible, cálida y con buenas cifras para la intensidad 1, 2, 3, 4 y 5.
      </p>
      <p className="text-sm text-muted-foreground">Texto secundario en tamaño pequeño.</p>
    </div>
  ),
}

export const FormaYMovimiento: Story = {
  name: "Forma, sombras y movimiento",
  render: () => (
    <div className="flex flex-wrap gap-4">
      <div className="grid size-32 place-items-center rounded-lg bg-card shadow-soft">shadow-soft</div>
      <div className="grid size-32 place-items-center rounded-2xl bg-card shadow-lifted">shadow-lifted</div>
      <div className="grid size-32 place-items-center rounded-full bg-secondary">pill</div>
      <ul className="text-sm text-muted-foreground">
        <li>--duration-fast: 200 ms</li>
        <li>--duration-base: 320 ms</li>
        <li>--duration-slow: 560 ms</li>
        <li>--ease-out-soft, --ease-spring</li>
      </ul>
    </div>
  ),
}
