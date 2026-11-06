/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Evoca",
        short_name: "Evoca",
        description: "Registra huellas sensoriales y conoce cómo evoluciona tu ánimo.",
        lang: "es-CO",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fff8ee",
        theme_color: "#fff8ee",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Las imágenes WebP (esferas, fondo fijo y posters) se guardan para verse sin conexión;
        // los videos (.mp4) no: pesan mucho y solo son decoración.
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        // Las fuentes vietnamitas solo se descargan si hacen falta; no se precargan.
        globIgnores: ["**/*vietnamese*"],
        navigateFallback: "/index.html",
        // La API nunca se guarda en caché: son datos personales y deben ser frescos.
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        // Al tocar la notificación del recordatorio diario se abre «Nueva huella» (HU5).
        importScripts: ["notification-click.js"],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  build: {
    // Las imágenes WebP siempre van como archivo aparte, nunca incrustadas en el JavaScript.
    assetsInlineLimit: (file) => (file.endsWith(".webp") ? false : undefined),
    rollupOptions: {
      output: {
        // Separa librerías grandes para que la carga inicial siga siendo liviana. Recharts no se
        // agrupa aquí: solo la usa «Mi ánimo» (diferida) y agrupada a mano arrastraba a React.
        manualChunks(id) {
          const normalized = id.replaceAll("\\", "/")
          if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(normalized)) return "react"
          if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(normalized)) return "motion"
          if (normalized.includes("node_modules/lottie-web/")) return "lottie"
          return undefined
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    // Pruebas de flujo completo (escriben letra por letra): 5 s se quedaba corto con el equipo cargado.
    testTimeout: 15_000,
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
