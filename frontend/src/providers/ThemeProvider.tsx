import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"

import { ThemeContext, type ThemePreference } from "@/hooks/use-theme"

const STORAGE_KEY = "evoca.theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"
const THEME_COLORS = { light: "#fff8ee", dark: "#1c120d" } as const

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    // Almacenamiento no disponible: se usa el tema del sistema.
  }
  return "system"
}

function subscribeToSystem(callback: () => void) {
  if (!window.matchMedia) return () => {}
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

const systemPrefersDark = () => !!window.matchMedia && window.matchMedia(DARK_QUERY).matches

interface ThemeProviderProps {
  children: ReactNode
  /** Solo para Storybook y pruebas: fija la preferencia inicial sin leer el almacenamiento. */
  initialPreference?: ThemePreference
}

export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => initialPreference ?? readStoredPreference(),
  )
  const prefersDark = useSyncExternalStore(subscribeToSystem, systemPrefersDark, () => false)
  const resolved = preference === "system" ? (prefersDark ? "dark" : "light") : preference

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolved === "dark")
    root.style.colorScheme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved])
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Se aplica igual durante la sesión.
    }
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
