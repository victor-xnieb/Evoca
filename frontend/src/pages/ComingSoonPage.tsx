import { Link } from "react-router"

import { EmptyState } from "@/components/evoca/EmptyState"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"

interface ComingSoonPageProps {
  title: string
  description: string
}

/** Sección que todavía no está construida en este sprint (se completa en su HU). */
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="rounded-3xl border bg-card/80 shadow-soft">
        <EmptyState
          illustration="bloom"
          title="Muy pronto"
          description={description}
          action={
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link to="/">Volver al inicio</Link>
            </Button>
          }
        />
      </div>
    </PageTransition>
  )
}
