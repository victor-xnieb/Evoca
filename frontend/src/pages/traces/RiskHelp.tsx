import { useEffect, useState } from "react"

import { HelpScreen } from "@/components/evoca/HelpScreen"
import { useSupportContent } from "@/hooks/use-support-content"
import { findRiskTerms, logSupportEvent } from "@/lib/support"

interface RiskHelpProps {
  /** Nota que la persona está escribiendo. */
  text: string
  /** Nota con la que se abrió la pantalla (al editar): lo que ya estaba escrito no la abre. */
  initialText?: string
}

/**
 * HU6 · Escenario 2: si al escribir la nota aparece una palabra de riesgo, se abre de
 * inmediato la pantalla de ayuda con las líneas oficiales. Al cerrarla no vuelve a abrirse
 * por la misma palabra; sí por una nueva. No se guarda la nota ni la palabra.
 */
export function RiskHelp({ text, initialText = "" }: RiskHelpProps) {
  const content = useSupportContent()
  const [dismissed, setDismissed] = useState<string[]>([])
  const terms = content?.risk_terms ?? []
  const ignored = new Set([...findRiskTerms(initialText, terms), ...dismissed])
  const fresh = findRiskTerms(text, terms).filter((term) => !ignored.has(term))
  const open = fresh.length > 0

  useEffect(() => {
    if (open) logSupportEvent("risk_screen_shown")
  }, [open])

  if (!content) return null
  return (
    <HelpScreen
      open={open}
      title={content.help_title}
      message={content.help_message}
      lines={content.help_lines}
      draft={content.draft}
      onOpenLine={() => logSupportEvent("help_line_opened")}
      onClose={() => setDismissed((previous) => [...previous, ...fresh])}
    />
  )
}
