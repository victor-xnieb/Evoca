import { AnimatePresence } from "motion/react"
import { useEffect, useState } from "react"
import { useLocation, useOutlet } from "react-router"

import { AppShell } from "@/components/evoca/AppShell"

import { preloadMemoriesPage } from "./preload"

/** Conserva la pantalla saliente mientras anima su salida. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export function RootLayout() {
  const location = useLocation()

  // Precarga el mapa de recuerdos sin competir con lo que se está mostrando (Safari: espera corta).
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preloadMemoriesPage, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(preloadMemoriesPage, 1500)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <div key={location.pathname}>
          <FrozenOutlet />
        </div>
      </AnimatePresence>
    </AppShell>
  )
}
