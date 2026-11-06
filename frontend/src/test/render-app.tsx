import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"

import { routes } from "@/app/routes"
import type { User } from "@/lib/auth"
import { AuthProvider } from "@/providers/AuthProvider"
import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"

interface Options {
  path?: string
  /** Sesión inicial. undefined = se lee del token guardado (como en la app real). */
  user?: User | null
  locked?: boolean
}

/** Monta la app completa (rutas, sesión, tema y movimiento reducido) en una ruta. */
export function renderApp({ path = "/", user, locked }: Options = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <ThemeProvider initialPreference="light">
      <MotionPreferenceProvider override>
        <AuthProvider initialUser={user} initiallyLocked={locked}>
          <RouterProvider router={router} />
        </AuthProvider>
      </MotionPreferenceProvider>
    </ThemeProvider>,
  )
  return router
}
