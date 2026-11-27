import type { CSSProperties } from "react"

import { coverOf, PAPERS, type Notebook } from "@/lib/diary"
import { cn } from "@/lib/utils"

export interface NotebookCoverProps {
  notebook: Pick<Notebook, "title" | "cover" | "paper" | "page_count">
  onOpen?: () => void
  className?: string
}

const pages = (count: number) => `${count} ${count === 1 ? "página" : "páginas"}`

/**
 * HU17: un cuaderno en la estantería. Portada con textura de tela o cartón, su color, su título
 * y una cinta marcador. Su nombre accesible dice el título, el papel y cuántas páginas tiene.
 */
export function NotebookCover({ notebook, onOpen, className }: NotebookCoverProps) {
  const cover = coverOf(notebook.cover)
  const paper = PAPERS.find((item) => item.value === notebook.paper)?.label ?? ""
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${notebook.title}: cuaderno de papel ${paper.toLowerCase()}, ${pages(notebook.page_count)}`}
      style={{ "--cover": cover.color } as CSSProperties}
      className={cn(
        "diary-cover group relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-r-2xl rounded-l-md p-4 pl-6 text-left text-white",
        "transition-transform duration-200 hover:-translate-y-1 hover:rotate-[-1deg] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0",
        className,
      )}
    >
      {/* Cinta marcador que asoma por abajo. */}
      <span aria-hidden="true" className="absolute right-6 -bottom-1 h-10 w-3 bg-[#f4d27a] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]" />
      <span className="rounded-lg bg-black/15 px-2 py-1.5 font-display text-lg leading-tight font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
        {notebook.title}
      </span>
      <span className="text-xs font-semibold text-white/85">{pages(notebook.page_count)}</span>
    </button>
  )
}
