import { Monitor, Moon, Sun } from "lucide-react"

import { GlassCard } from "@/components/evoca/GlassCard"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useTheme, type ThemePreference } from "@/hooks/use-theme"

import { DataSection } from "./settings/DataSection"
import { SecuritySection } from "./settings/SecuritySection"

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
]

export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const reduced = useReducedMotion()

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6">
      <h1 className="self-start rounded-2xl bg-background/75 px-3 py-1 text-3xl font-semibold backdrop-blur-md">
        Ajustes
      </h1>

      <GlassCard as="section" aria-labelledby="apariencia" className="flex flex-col gap-3 p-5">
        <h2 id="apariencia" className="text-xl font-semibold">
          Apariencia
        </h2>
        <Tabs value={preference} onValueChange={(value) => setPreference(value as ThemePreference)}>
          <TabsList className="h-13 w-full rounded-full p-1">
            {THEME_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="h-11 flex-1 gap-2 rounded-full text-sm">
                <option.icon aria-hidden="true" className="size-4" />
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">
          {reduced
            ? "Tu dispositivo pide reducir el movimiento: Evoca muestra las animaciones al mínimo."
            : "Evoca respeta la opción de reducir movimiento de tu dispositivo."}
        </p>
      </GlassCard>

      <SecuritySection />
      <DataSection />
    </PageTransition>
  )
}
