import { Outlet } from "react-router"

import { AnimatedBackground } from "@/components/evoca/AnimatedBackground"
import { InteractiveCursor } from "@/components/evoca/InteractiveCursor"
import { ThemeSwitch } from "@/components/evoca/ThemeSwitch"

/** Marco de las pantallas de cuenta (entrar, registrarse, crear PIN): sin navegación inferior. */
export function AuthLayout() {
  return (
    <div className="evoca-backdrop relative isolate flex min-h-dvh flex-col">
      <AnimatedBackground />
      <InteractiveCursor />
      <header className="mx-auto flex w-full max-w-lg justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <ThemeSwitch />
      </header>
      <main id="contenido" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-12">
        <Outlet />
      </main>
    </div>
  )
}
