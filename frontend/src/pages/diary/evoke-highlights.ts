import { Extension } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

import type { Highlight } from "@/lib/diary"

export const evokeKey = new PluginKey<DecorationSet>("evokeHighlights")

/** Minúsculas y sin tildes, letra por letra (así las posiciones no cambian). */
function fold(text: string) {
  return Array.from(text, (char) => char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().charAt(0) || char).join("")
}

/** Decoraciones para cada frase de la evocación, buscándola en cada párrafo (sin tildes ni mayúsculas). */
export function highlightDecorations(doc: ProseMirrorNode, highlights: Highlight[]) {
  const decorations: Decoration[] = []
  doc.descendants((node, position) => {
    if (!node.isTextblock) return true
    const segments: Array<{ from: number; text: string }> = []
    node.descendants((child, offset) => {
      if (child.isText && child.text) segments.push({ from: position + 1 + offset, text: child.text })
    })
    const text = fold(segments.map((segment) => segment.text).join(""))
    // Del índice en el texto del párrafo a la posición en el documento.
    const at = (index: number) => {
      let rest = index
      for (const segment of segments) {
        if (rest <= segment.text.length) return segment.from + rest
        rest -= segment.text.length
      }
      return segments.at(-1)!.from + segments.at(-1)!.text.length
    }
    for (const highlight of highlights) {
      const needle = fold(highlight.quote.trim())
      if (!needle) continue
      let index = text.indexOf(needle)
      while (index >= 0) {
        decorations.push(
          Decoration.inline(at(index), at(index + needle.length), {
            class: highlight.memory_id ? "diary-evoked diary-evoked-link" : "diary-evoked",
            style: `--glow: var(--emotion-${highlight.emotion})`,
            ...(highlight.memory_id ? { "data-memory": highlight.memory_id, title: "Ver el recuerdo" } : {}),
          }),
        )
        index = text.indexOf(needle, index + needle.length)
      }
    }
    return false
  })
  return DecorationSet.create(doc, decorations)
}

/**
 * HU18: ilumina en la página las palabras de donde salió cada huella, con el color de su emoción.
 * Las de un recuerdo aceptado llevan a él al tocarlas. No cambia lo escrito: son decoraciones.
 */
export const EvokeHighlights = Extension.create<{ onOpenMemory: (id: string) => void }>({
  name: "evokeHighlights",

  addOptions() {
    return { onOpenMemory: () => {} }
  },

  addProseMirrorPlugins() {
    const { onOpenMemory } = this.options
    return [
      new Plugin<DecorationSet>({
        key: evokeKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous, _, state) {
            const highlights = transaction.getMeta(evokeKey) as Highlight[] | undefined
            if (highlights) return highlightDecorations(state.doc, highlights)
            return previous.map(transaction.mapping, transaction.doc)
          },
        },
        props: {
          decorations(state) {
            return evokeKey.getState(state)
          },
          handleDOMEvents: {
            click(_, event) {
              const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-memory]")
              if (!target?.dataset.memory) return false
              onOpenMemory(target.dataset.memory)
              return true
            },
          },
        },
      }),
    ]
  },
})
