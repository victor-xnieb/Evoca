import { similarityLabel, type SearchMode, type SimilarityLevel } from "@/lib/search"
import { cn } from "@/lib/utils"

const FILLED: Record<SimilarityLevel, number> = { high: 3, medium: 2, low: 1 }

export interface SimilarityMeterProps {
  level: SimilarityLevel
  mode?: SearchMode
  className?: string
}

/**
 * Qué tan parecida es una huella a lo que se buscó (HU12 · escenario 2): tres barras y su
 * nombre («Muy parecida», «Parecida», «Algo parecida»). El texto acompaña siempre a las barras.
 */
export function SimilarityMeter({ level, mode = "meaning", className }: SimilarityMeterProps) {
  const filled = FILLED[level]
  return (
    <span
      data-testid="similarity"
      data-level={level}
      className={cn("inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold", className)}
    >
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn("w-1.5 rounded-full", index < filled ? "bg-primary" : "bg-muted")}
            style={{ height: 6 + index * 4 }}
          />
        ))}
      </span>
      {similarityLabel(level, mode)}
    </span>
  )
}
