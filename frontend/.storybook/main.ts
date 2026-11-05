import type { StorybookConfig } from "@storybook/react-vite"

/**
 * Storybook es solo una herramienta de desarrollo: documenta el catálogo de
 * src/components/evoca y nunca entra en el paquete de producción de la app.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    // El service worker de la PWA no tiene sentido dentro de Storybook.
    viteConfig.plugins = (viteConfig.plugins ?? []).flat().filter((plugin) => {
      const name = plugin && typeof plugin === "object" && "name" in plugin ? String(plugin.name) : ""
      return !name.startsWith("vite-plugin-pwa")
    })
    return viteConfig
  },
}

export default config
