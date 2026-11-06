import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"

import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { PageTransition } from "@/components/evoca/PageTransition"
import { SupportCard } from "@/components/evoca/SupportCard"
import { useSupportContent } from "@/hooks/use-support-content"
import { logSupportEvent } from "@/lib/support"

/** HU6: ruta de ayuda con las líneas oficiales. Evoca orienta; no reemplaza a un profesional. */
export function HelpPage() {
  const content = useSupportContent()

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-background/75 px-4 text-sm font-semibold backdrop-blur-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al inicio
      </Link>
      <h1 className="self-start rounded-2xl bg-background/75 px-3 py-1 text-3xl font-semibold backdrop-blur-md">
        Ayuda profesional
      </h1>
      {content ? (
        <SupportCard
          title={content.help_title}
          message={content.help_message}
          lines={content.help_lines}
          draft={content.draft}
          onOpenHelp={() => logSupportEvent("help_line_opened")}
        />
      ) : (
        <div className="grid min-h-60 place-items-center">
          <EvocaLoader />
        </div>
      )}
      <p className="rounded-2xl bg-background/75 p-4 text-sm backdrop-blur-md">
        Evoca te acompaña a reconocer cómo te sientes, pero no reemplaza la atención de un profesional de la salud
        mental.
      </p>
    </PageTransition>
  )
}
