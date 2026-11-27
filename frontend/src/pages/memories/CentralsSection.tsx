import { Star } from "lucide-react"

import { EmotionOrb } from "@/components/evoca/EmotionOrb"
import { GlassCard } from "@/components/evoca/GlassCard"
import { isEmotionSlug } from "@/lib/emotions"
import { centralMemories, MAX_CENTRAL, type MemoryNode } from "@/lib/memories"
import { cn } from "@/lib/utils"

export interface CentralsSectionProps {
  nodes: MemoryNode[]
  maxCentral?: number
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * HU11 · Escenario 2: «Mis recuerdos centrales», los que más definen a la persona, a la mano
 * encima del mapa. Tocar uno lo abre en el mapa, como tocar su esfera.
 */
export function CentralsSection({ nodes, maxCentral = MAX_CENTRAL, selectedId, onSelect }: CentralsSectionProps) {
  const centrals = centralMemories(nodes)

  return (
    <GlassCard as="section" aria-labelledby="centrales" className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="centrales" className="inline-flex items-center gap-2 text-lg font-semibold">
          <Star aria-hidden="true" className="size-5 text-(--emotion-alegria-ink)" fill="var(--emotion-alegria)" strokeWidth={1.5} />
          Mis recuerdos centrales
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {centrals.length} de {maxCentral}
        </span>
      </div>

      {centrals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Los recuerdos que más te definen. Abre un recuerdo del mapa y toca «Marcar como central» para tenerlo aquí, a la
          mano (hasta {maxCentral}).
        </p>
      ) : (
        <ul aria-label="Recuerdos centrales" className="flex gap-2 overflow-x-auto pb-1">
          {centrals.map((node) => (
            <li key={node.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={selectedId === node.id}
                onClick={() => onSelect(node.id)}
                className={cn(
                  "flex min-h-12 max-w-56 items-center gap-2 rounded-full border bg-card py-1.5 pr-4 pl-1.5 text-left text-sm font-semibold transition-colors",
                  "hover:border-ring focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selectedId === node.id && "border-(--emotion-alegria) bg-secondary",
                )}
              >
                {isEmotionSlug(node.emotion) && <EmotionOrb emotion={node.emotion} size={36} decorative />}
                <span className="line-clamp-2">{node.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
