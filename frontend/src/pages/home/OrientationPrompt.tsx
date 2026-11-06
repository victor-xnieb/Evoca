import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import { SupportCard } from "@/components/evoca/SupportCard"
import { Button } from "@/components/ui/button"
import { useSupportContent } from "@/hooks/use-support-content"
import { logSupportEvent, supportApi } from "@/lib/support"

/**
 * HU6 · Escenario 1: si el ánimo fue bajo en 14 de los últimos 21 días (lo decide el
 * servidor), al abrir la app aparece un mensaje de orientación cálido y sin diagnóstico.
 * «Ahora no» lo cierra; abrir la ruta de ayuda queda registrado.
 */
export function OrientationPrompt() {
  const content = useSupportContent()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const run = { cancelled: false }
    supportApi
      .orientation()
      .then((status) => {
        if (run.cancelled || !status.show) return
        setVisible(true)
        logSupportEvent("orientation_shown")
      })
      .catch(() => {})
    return () => {
      run.cancelled = true
    }
  }, [])

  if (!visible || !content) return null
  return (
    <SupportCard
      title={content.orientation_title}
      message={content.orientation_message}
      lines={[]}
      draft={content.draft}
      action={
        <Button
          className="h-11 rounded-full px-5"
          onClick={() => {
            logSupportEvent("help_opened")
            navigate("/ayuda")
          }}
        >
          Ver opciones de ayuda
        </Button>
      }
      onDismiss={() => {
        logSupportEvent("orientation_dismissed")
        setVisible(false)
      }}
    />
  )
}
