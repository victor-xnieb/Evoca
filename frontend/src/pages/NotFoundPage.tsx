import { Link } from "react-router"

import { EmptyState } from "@/components/evoca/EmptyState"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <PageTransition>
      <EmptyState
        title="Esta página no existe"
        description="Puede que el enlace haya cambiado. Volvamos a un lugar conocido."
        action={
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/">Ir al inicio</Link>
          </Button>
        }
      />
    </PageTransition>
  )
}
