import { MotionConfig } from "motion/react"
import { useEffect, type ReactNode } from "react"

import { ReducedMotionContext, useSystemReducedMotion } from "@/hooks/use-reduced-motion"

interface MotionPreferenceProviderProps {
  children: ReactNode
  /** Fuerza el modo (true = reducido). Sin valor, se respeta la preferencia del sistema. */
  override?: boolean
}

/**
 * Aplica la preferencia de movimiento a toda la app: a Motion (MotionConfig), a las
 * animaciones CSS (atributo data-motion en <html>) y al hook useReducedMotion.
 */
export function MotionPreferenceProvider({ children, override }: MotionPreferenceProviderProps) {
  const system = useSystemReducedMotion()
  const reduced = override ?? system

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduce" : "full"
  }, [reduced])

  return (
    <ReducedMotionContext.Provider value={reduced}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>
    </ReducedMotionContext.Provider>
  )
}
