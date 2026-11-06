import type { RouteObject } from "react-router"

import { LoginPage } from "@/pages/auth/LoginPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"

import { AuthLayout } from "./AuthLayout"
import {
  CreatePinPage,
  Deferred,
  HelpPage,
  MoodPage,
  MyTracesPage,
  NewTracePage,
  RegisterPage,
  SettingsPage,
  TraceDetailPage,
} from "./deferred"
import { PublicOnly, RequireAuth, RequireSession } from "./guards"
import { RootLayout } from "./RootLayout"

/**
 * Rutas de la app. Entrar, registrarse y crear el PIN son públicas; el resto exige sesión,
 * PIN creado y desbloqueo. Las secciones marcadas como «Muy pronto» se construyen en su HU.
 */
export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        path: "entrar",
        element: (
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        ),
      },
      {
        path: "registro",
        element: (
          <PublicOnly>
            <Deferred>
              <RegisterPage />
            </Deferred>
          </PublicOnly>
        ),
      },
      {
        path: "crear-pin",
        element: (
          <RequireSession>
            <Deferred>
              <CreatePinPage />
            </Deferred>
          </RequireSession>
        ),
      },
    ],
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "nueva-huella",
        element: (
          <Deferred>
            <NewTracePage />
          </Deferred>
        ),
      },
      {
        path: "mis-huellas",
        element: (
          <Deferred>
            <MyTracesPage />
          </Deferred>
        ),
      },
      {
        path: "mis-huellas/:id",
        element: (
          <Deferred>
            <TraceDetailPage />
          </Deferred>
        ),
      },
      {
        path: "animo",
        element: (
          <Deferred>
            <MoodPage />
          </Deferred>
        ),
      },
      {
        path: "ayuda",
        element: (
          <Deferred>
            <HelpPage />
          </Deferred>
        ),
      },
      {
        path: "ajustes",
        element: (
          <Deferred>
            <SettingsPage />
          </Deferred>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
