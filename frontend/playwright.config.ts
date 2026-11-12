import { defineConfig, devices } from "@playwright/test"

const PORT = 5176

/**
 * Pruebas e2e en el navegador (Playwright) sobre la versión compilada de la app, como la ve
 * un teléfono. La API se simula en cada prueba: no hace falta el backend ni se toca Neon.
 *
 *   npx playwright install chromium      # una vez (o usa tu Chrome: PLAYWRIGHT_CHANNEL=chrome)
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    // El service worker de la PWA no debe interceptar las respuestas simuladas.
    serviceWorkers: "block",
  },
  webServer: {
    // Compila en una carpeta aparte (no pisa dist/) con una API que no existe: todo se simula.
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { VITE_API_URL: "http://127.0.0.1:8999/api/v1" },
  },
})
