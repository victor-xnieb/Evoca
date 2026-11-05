import type { ReactNode } from "react"

import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"

/** Proveedores globales: tema claro/oscuro y preferencia de movimiento. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MotionPreferenceProvider>{children}</MotionPreferenceProvider>
    </ThemeProvider>
  )
}
