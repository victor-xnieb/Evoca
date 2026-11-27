import Highlight from "@tiptap/extension-highlight"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import { Highlighter, Underline as UnderlineIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"

import { getEmotionVisual } from "@/lib/emotions"
import { formatDate } from "@/lib/format"
import { diaryApi, FONTS, fontOf, HIGHLIGHTS, INKS, inkVar, PAPERS, type DiaryPage, type PageChanges, type Paper } from "@/lib/diary"
import { labelOf, type TraceCatalog } from "@/lib/traces"
import { cn } from "@/lib/utils"

import { RiskHelp } from "../traces/RiskHelp"

import "@fontsource/caveat/400.css"
import "@fontsource/patrick-hand/400.css"
import "@fontsource/kalam/400.css"
import "@fontsource/indie-flower/400.css"

type SaveState = "saved" | "saving" | "error"

const SAVE_DELAY_MS = 800
// Caveat tiene letras pequeñas: va un poco más grande. Todas quedan sobre los 16 px.
const FONT_SIZE: Record<string, string> = { caveat: "1.6rem", patrick: "1.3rem", kalam: "1.2rem", indie: "1.3rem" }

const PATTERN: Record<Paper, string> = { lined: "diary-lines", grid: "diary-grid", dots: "diary-dots", blank: "" }

export interface PageEditorProps {
  page: DiaryPage
  /** Papel del cuaderno: lo usa la página si no eligió otro. */
  notebookPaper: Paper
  catalog: TraceCatalog | null
  onChange: (page: DiaryPage) => void
}

/**
 * HU17: una hoja del cuadernillo. Se escribe directo sobre el papel con letra manuscrita; al
 * seleccionar texto aparece una barra discreta para resaltar, subrayar o cambiar la tinta. Lo
 * escrito se guarda solo. La cinta de la esquina toma el color de la emoción del día, con su
 * nombre. Si aparece una palabra de riesgo (HU6), se abre de inmediato la ayuda.
 */
export function PageEditor({ page, notebookPaper, catalog, onChange }: PageEditorProps) {
  const [save, setSave] = useState<SaveState>("saved")
  const [text, setText] = useState(page.text)
  const timer = useRef<number | null>(null)
  const pending = useRef<PageChanges>({})
  const latest = useRef(page)
  useEffect(() => {
    latest.current = page
  }, [page])

  const flush = useCallback(async () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    const changes = pending.current
    if (!Object.keys(changes).length) return
    pending.current = {}
    setSave("saving")
    try {
      const saved = await diaryApi.updatePage(latest.current.id, changes)
      setSave("saved")
      onChange(saved)
    } catch {
      pending.current = { ...changes, ...pending.current }
      setSave("error")
    }
  }, [onChange])

  const queue = useCallback(
    (changes: PageChanges, now = false) => {
      pending.current = { ...pending.current, ...changes }
      setSave("saving")
      if (timer.current !== null) window.clearTimeout(timer.current)
      if (now) void flush()
      else timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    },
    [flush],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, horizontalRule: false, blockquote: false, link: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: page.content,
    editorProps: {
      attributes: {
        "aria-label": `Página del ${formatDate(`${page.day}T12:00:00`, { weekday: "long", day: "numeric", month: "long" })}`,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: current }) => {
      setText(current.getText({ blockSeparator: "\n" }))
      queue({ content: current.getJSON() })
    },
  })

  // Al salir de la página (o de la app) se guarda lo que falte.
  useEffect(() => () => void flush(), [flush])

  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      underline: current?.isActive("underline") ?? false,
      highlight: current?.isActive("highlight") ?? false,
      empty: current?.isEmpty ?? true,
    }),
  })

  const paper = (page.paper || notebookPaper) as Paper
  const emotion = page.day_emotion
  const visual = emotion ? getEmotionVisual(emotion) : null
  const emotionName = emotion && catalog ? labelOf(catalog.emotions, emotion) : emotion
  const font = fontOf(page.font)

  return (
    <div className="flex flex-col gap-3">
      {/* Letra, tinta y papel de la página: discretos, encima de la hoja. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-background/70 px-3 py-2 text-sm backdrop-blur-md">
        <label className="flex items-center gap-2">
          <span className="font-semibold">Letra</span>
          <select
            value={page.font}
            onChange={(event) => {
              onChange({ ...page, font: event.target.value as DiaryPage["font"] })
              queue({ font: event.target.value as DiaryPage["font"] }, true)
            }}
            className="h-10 rounded-xl border border-input bg-background px-2"
          >
            {FONTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">Tinta</legend>
          <span aria-hidden="true" className="mr-1 font-semibold">
            Tinta
          </span>
          {INKS.map((item) => (
            <label key={item.value} className="cursor-pointer" title={item.label}>
              <input
                type="radio"
                name={`tinta-${page.id}`}
                value={item.value}
                checked={page.ink === item.value}
                onChange={() => {
                  onChange({ ...page, ink: item.value })
                  queue({ ink: item.value }, true)
                }}
                className="peer sr-only"
              />
              <span
                className="block size-8 rounded-full border-2 border-transparent peer-checked:border-foreground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                style={{ background: inkVar(item.value) }}
              />
              <span className="sr-only">{item.label}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Papel</span>
          <select
            value={paper}
            onChange={(event) => {
              onChange({ ...page, paper: event.target.value as Paper })
              queue({ paper: event.target.value as Paper }, true)
            }}
            className="h-10 rounded-xl border border-input bg-background px-2"
          >
            {PAPERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {save === "saving" ? "Guardando…" : save === "error" ? "No se pudo guardar. Reintentaremos." : "Guardado"}
        </span>
      </div>

      <article
        className="diary-paper overflow-hidden rounded-r-3xl rounded-l-lg px-6 pt-14 pb-10 sm:px-10"
        style={
          {
            "--diary-ink": inkVar(page.ink),
            "--diary-size": FONT_SIZE[page.font] ?? "1.4rem",
            fontFamily: font.family,
          } as CSSProperties
        }
      >
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", PATTERN[paper])} />
        {paper === "lined" && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-12 w-px bg-(--paper-margin) sm:left-16" />}

        {/* Cinta marcador: color de la emoción del día y su nombre en texto (no solo el color). */}
        <div className="absolute top-0 right-5 flex flex-col items-center">
          <span
            aria-hidden="true"
            className="block h-12 w-6 [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
            style={{ background: visual?.color ?? "var(--evoca-day-empty)" }}
          />
        </div>
        <header className="relative mb-2 flex items-baseline justify-between gap-3 pr-10 font-sans">
          <time dateTime={page.day} className="text-sm font-semibold text-(--diary-ink) opacity-80">
            {formatDate(`${page.day}T12:00:00`, { weekday: "long", day: "numeric", month: "long" })}
          </time>
          <span className="text-xs font-semibold text-(--diary-ink) opacity-80">
            {emotionName ? `Emoción del día: ${emotionName}` : "Día sin huellas"}
          </span>
        </header>

        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-0.5 rounded-3xl border bg-card px-1 py-1 font-sans shadow-lifted"
          >
            {HIGHLIGHTS.map((item) => (
              <button
                key={item.color}
                type="button"
                aria-label={`Resaltar en ${item.label.toLowerCase()}`}
                onClick={() => editor.chain().focus().toggleHighlight({ color: item.color }).run()}
                className="grid size-8 place-items-center rounded-full hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Highlighter aria-hidden="true" className="size-4" style={{ color: item.color.replace(/0\.\d+\)$/, "1)") }} />
              </button>
            ))}
            <button
              type="button"
              aria-label="Subrayar"
              aria-pressed={marks?.underline ?? false}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn("grid size-8 place-items-center rounded-full hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring", marks?.underline && "bg-secondary")}
            >
              <UnderlineIcon aria-hidden="true" className="size-4" />
            </button>
            <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-border" />
            {INKS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-label={`Tinta ${item.label.toLowerCase()} para lo seleccionado`}
                onClick={() => editor.chain().focus().setColor(inkVar(item.value)).run()}
                className="grid size-8 place-items-center rounded-full hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span aria-hidden="true" className="size-4 rounded-full" style={{ background: inkVar(item.value) }} />
              </button>
            ))}
          </BubbleMenu>
        )}

        <div className="diary-writing relative">
          {marks?.empty && (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 opacity-45"
              style={{ fontSize: "var(--diary-size)", lineHeight: "var(--line-gap)", color: "var(--diary-ink)" }}
            >
              Escribe cómo te sientes hoy…
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      </article>

      <RiskHelp text={text} initialText={page.text} closeLabel="Volver a mi página" />
    </div>
  )
}
