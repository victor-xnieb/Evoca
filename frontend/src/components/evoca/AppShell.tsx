import { CalendarHeart, House, Library, Plus, Settings, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import type { CSSProperties, ReactNode } from "react"
import { NavLink } from "react-router"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { getEmotionVisual } from "@/lib/emotions"
import { spring } from "@/lib/motion"
import { cn } from "@/lib/utils"

import { AnimatedBackground } from "./AnimatedBackground"
import { InteractiveCursor } from "./InteractiveCursor"
import { ThemeSwitch } from "./ThemeSwitch"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Acción principal: se destaca con el color de la emoción reciente. */
  primary?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", icon: House },
  { to: "/nueva-huella", label: "Nueva huella", icon: Plus, primary: true },
  { to: "/mis-huellas", label: "Mis huellas", icon: Library },
  { to: "/animo", label: "Ánimo", icon: CalendarHeart },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
]

export interface AppShellProps {
  children: ReactNode
  /** Última emoción registrada: tiñe suavemente el fondo. */
  accentEmotion?: string | null
  /** "static" muestra el fondo sin video (pantallas que deben ser calmadas, como la de ayuda). */
  background?: "animated" | "static"
  className?: string
}

/**
 * Estructura de las pantallas principales: encabezado con el cambio de tema,
 * fondo animado (con el degradado de la emoción reciente debajo mientras carga) y
 * navegación inferior (también en escritorio, como un dock flotante).
 */
export function AppShell({ children, accentEmotion, background = "animated", className }: AppShellProps) {
  const reduced = useReducedMotion()
  const style = accentEmotion
    ? ({ "--accent-emotion": getEmotionVisual(accentEmotion).color } as CSSProperties)
    : undefined

  return (
    <div className="evoca-backdrop relative isolate flex min-h-dvh flex-col" style={style}>
      <AnimatedBackground variant={background} />
      <InteractiveCursor />
      {/* En oscuro, refuerzo suave detrás del interruptor de tema. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 hidden h-28 bg-linear-to-b from-background/85 via-background/55 to-transparent dark:block"
      />
      <a
        href="#contenido"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      {/* La marca vive en el hero de Inicio; aquí solo el cambio de tema (no se repite). */}
      <header className="mx-auto flex w-full max-w-2xl items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 lg:max-w-5xl">
        <ThemeSwitch />
      </header>

      <main id="contenido" className={cn("mx-auto w-full max-w-2xl flex-1 lg:max-w-5xl px-5 pt-2 pb-36", className)}>
        {children}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <ul className="flex w-full max-w-md items-stretch justify-between gap-1 rounded-[1.75rem] border bg-card/90 p-1.5 shadow-lifted backdrop-blur-md">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-3xl px-1 text-xs font-semibold",
                    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    item.primary && !isActive && "text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId={reduced ? undefined : "nav-active"}
                        transition={spring}
                        className="absolute inset-0 rounded-3xl bg-primary"
                      />
                    )}
                    {item.primary && !isActive && (
                      <span aria-hidden="true" className="absolute inset-1 rounded-[1.25rem] bg-(--accent-emotion) opacity-35" />
                    )}
                    <item.icon aria-hidden="true" className="relative size-5" strokeWidth={item.primary ? 2.6 : 2} />
                    <span className="relative text-center leading-tight">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
