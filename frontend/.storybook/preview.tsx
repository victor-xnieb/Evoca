import type { Decorator, Preview } from "@storybook/react-vite"
import { MemoryRouter } from "react-router"

import { MotionPreferenceProvider } from "../src/providers/MotionPreferenceProvider"
import { ThemeProvider } from "../src/providers/ThemeProvider"

import "../src/index.css"

/** Aplica el tema (claro/oscuro) y la preferencia de movimiento elegidos en la barra. */
const withEvocaProviders: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? "dark" : "light"
  const motion = context.globals.motion
  const override = motion === "reduce" ? true : motion === "full" ? false : undefined

  return (
    <ThemeProvider key={theme} initialPreference={theme}>
      <MotionPreferenceProvider override={override}>
        <MemoryRouter>
          <div className="evoca-backdrop min-h-full p-6 text-foreground">
            <Story />
          </div>
        </MemoryRouter>
      </MotionPreferenceProvider>
    </ThemeProvider>
  )
}

const preview: Preview = {
  decorators: [withEvocaProviders],
  globalTypes: {
    theme: {
      description: "Tema de color",
      toolbar: {
        title: "Tema",
        icon: "mirror",
        items: [
          { value: "light", title: "Claro", icon: "sun" },
          { value: "dark", title: "Oscuro", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
    motion: {
      description: "Probar con movimiento reducido",
      toolbar: {
        title: "Movimiento",
        icon: "transfer",
        items: [
          { value: "system", title: "Según el sistema" },
          { value: "full", title: "Completo" },
          { value: "reduce", title: "Reducido" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", motion: "system" },
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    options: {
      storySort: { order: ["Fundamentos", "Evoca", "Externos"] },
    },
  },
  tags: ["autodocs"],
}

export default preview
