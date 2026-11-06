/*
 * Adaptado del interruptor «rotten-rat-40» de AmIt-DasIT en Uiverse.io (MIT,
 * https://uiverse.io/AmIt-DasIT/rotten-rat-40). Cambios: componente React accesible
 * (role="switch"), colores de los tokens de Evoca (luna marrón, sol de alegría) y
 * conectado al tema de la app. Ver CREDITS.md.
 */
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface ThemeSwitchProps {
  className?: string
}

/** Cambia entre modo claro y oscuro. La luna se convierte en sol al activarse el claro. */
export function ThemeSwitch({ className }: ThemeSwitchProps) {
  const { resolved, setPreference } = useTheme()
  const isDark = resolved === "dark"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Modo oscuro"
      onClick={() => setPreference(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1",
        "bg-ink transition-colors duration-300 dark:bg-day-empty",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "after:absolute after:-inset-1.5 after:content-['']",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-6 rounded-full transition-transform duration-300 ease-spring",
          isDark
            ? "translate-x-6 bg-day-empty shadow-[inset_-5px_-3px_0_1px_var(--evoca-ink)]"
            : "translate-x-0 bg-(--emotion-alegria)",
        )}
      />
    </button>
  )
}
