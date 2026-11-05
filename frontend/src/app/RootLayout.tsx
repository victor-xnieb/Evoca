import { AnimatePresence } from "motion/react"
import { useState } from "react"
import { useLocation, useOutlet } from "react-router"

import { AppShell } from "@/components/evoca/AppShell"

/** Conserva la pantalla saliente mientras anima su salida. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export function RootLayout() {
  const location = useLocation()

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
