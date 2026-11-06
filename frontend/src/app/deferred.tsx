import { lazy, Suspense, type ReactNode } from "react"

import { EvocaLoader } from "@/components/evoca/EvocaLoader"

// Pantallas que se cargan bajo demanda (formularios y diálogos que no hacen falta al abrir).
export const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })))
export const CreatePinPage = lazy(() => import("@/pages/auth/CreatePinPage").then((m) => ({ default: m.CreatePinPage })))
export const NewTracePage = lazy(() => import("@/pages/NewTracePage").then((m) => ({ default: m.NewTracePage })))
export const MyTracesPage = lazy(() => import("@/pages/MyTracesPage").then((m) => ({ default: m.MyTracesPage })))
export const TraceDetailPage = lazy(() => import("@/pages/TraceDetailPage").then((m) => ({ default: m.TraceDetailPage })))
export const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })))

export function Deferred({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-60 place-items-center">
          <EvocaLoader />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
