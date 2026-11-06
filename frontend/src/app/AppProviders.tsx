import type { ReactNode } from "react"

import { AuthProvider } from "@/providers/AuthProvider"
import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"

/** Proveedores globales: tema claro/oscuro, preferencia de movimiento y sesión. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MotionPreferenceProvider>
        <AuthProvider>{children}</AuthProvider>
      </MotionPreferenceProvider>
    </ThemeProvider>
  )
}
