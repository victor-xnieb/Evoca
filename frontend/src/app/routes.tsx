import type { RouteObject } from "react-router"

import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { SettingsPage } from "@/pages/SettingsPage"

import { RootLayout } from "./RootLayout"

/** Rutas de la app. Las secciones marcadas como «Muy pronto» se construyen en su HU. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "nueva-huella",
        element: (
          <ComingSoonPage
            title="Nueva huella"
            description="Aquí registrarás un aroma, un color, una canción, un sabor, una textura o un lugar con lo que sentiste."
          />
        ),
      },
      {
        path: "mis-huellas",
        element: (
          <ComingSoonPage
            title="Mis huellas"
            description="Aquí verás, filtrarás y editarás todas tus huellas, de la más reciente a la más antigua."
          />
        ),
      },
      {
        path: "animo",
        element: (
          <ComingSoonPage
            title="Mi ánimo"
            description="Aquí verás cómo evoluciona tu ánimo en una gráfica y en un calendario de colores."
          />
        ),
      },
      { path: "ajustes", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
