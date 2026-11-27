import { ArrowLeft, ChevronLeft, ChevronRight, FilePlus2 } from "lucide-react"
import { AnimatePresence, motion, type PanInfo } from "motion/react"
import { useCallback, useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"

import { EmptyState } from "@/components/evoca/EmptyState"
import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { GlassCard } from "@/components/evoca/GlassCard"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/hooks/use-catalog"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { coverOf, diaryApi, type DiaryPage, type Notebook } from "@/lib/diary"

import { PageEditor } from "./PageEditor"

import "@/styles/diary.css"

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; notebook: Notebook; pages: DiaryPage[] }

// Al pasar la hoja: se desliza y gira un poco sobre el lomo, como papel.
const turn = {
  enter: (direction: number) => ({ x: direction * 60, rotateY: direction * -12, opacity: 0 }),
  center: { x: 0, rotateY: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -60, rotateY: direction * 12, opacity: 0 }),
}

/** HU17: un cuaderno abierto, con sus páginas una a una. Se pasa de hoja deslizando o con los botones. */
export function NotebookPage() {
  const { notebookId = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const { catalog } = useCatalog()
  const reduced = useReducedMotion()
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [direction, setDirection] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    const run = { cancelled: false }
    Promise.all([diaryApi.notebook(notebookId), diaryApi.pages(notebookId)])
      .then(([notebook, pages]) => {
        if (!run.cancelled) setState({ status: "ready", notebook, pages })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setState({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [notebookId, attempt])

  const pages = state.status === "ready" ? state.pages : []
  const requested = Number(params.get("pagina"))
  // HU18: desde un recuerdo se abre la hoja donde nació (?hoja=<id>).
  const sheet = pages.findIndex((item) => item.id === params.get("hoja"))
  const index = !pages.length
    ? -1
    : sheet >= 0
      ? sheet
      : Number.isInteger(requested) && requested >= 1 && requested <= pages.length
        ? requested - 1
        : pages.length - 1
  const current = index >= 0 ? pages[index] : null

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= pages.length || next === index) return
      setDirection(next > index ? 1 : -1)
      setParams({ pagina: String(next + 1) }, { replace: true })
    },
    [index, pages.length, setParams],
  )

  const addPage = async () => {
    if (state.status !== "ready") return
    setAdding(true)
    setAddError(null)
    try {
      const page = await diaryApi.createPage(notebookId)
      setState({ ...state, pages: [...state.pages, page].sort((a, b) => a.day.localeCompare(b.day) || a.created_at.localeCompare(b.created_at)), notebook: { ...state.notebook, page_count: state.notebook.page_count + 1 } })
      setDirection(1)
      const position = [...state.pages, page].sort((a, b) => a.day.localeCompare(b.day) || a.created_at.localeCompare(b.created_at)).findIndex((item) => item.id === page.id)
      setParams({ pagina: String(position + 1) }, { replace: true })
    } catch (error) {
      setAddError((error as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const replacePage = useCallback((page: DiaryPage) => {
    setState((value) => (value.status === "ready" ? { ...value, pages: value.pages.map((item) => (item.id === page.id ? { ...item, ...page } : item)) } : value))
  }, [])

  // Deslizar el dedo pasa la hoja. Solo con un gesto táctil rápido y horizontal, para no
  // confundirlo con seleccionar texto.
  const onSwipe = (event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if ("pointerType" in event && event.pointerType !== "touch") return
    if (Math.abs(info.offset.y) > 60 || Math.abs(info.velocity.x) < 200) return
    if (info.offset.x < -80) goTo(index + 1)
    else if (info.offset.x > 80) goTo(index - 1)
  }

  if (state.status === "loading") {
    return (
      <div className="grid min-h-80 place-items-center">
        <EvocaLoader label="Abriendo tu cuaderno" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <PageTransition className="mx-auto w-full max-w-3xl gap-6">
        <GlassCard>
          <EmptyState
            variant="error"
            title="No pudimos abrir este cuaderno"
            description={state.message}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  className="h-11 rounded-full px-5"
                  onClick={() => {
                    setState({ status: "loading" })
                    setAttempt((value) => value + 1)
                  }}
                >
                  Intentar de nuevo
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full px-5">
                  <Link to="/cuadernillo">Volver a la estantería</Link>
                </Button>
              </div>
            }
          />
        </GlassCard>
      </PageTransition>
    )
  }

  const { notebook } = state
  const cover = coverOf(notebook.cover)

  return (
    <PageTransition className="mx-auto w-full max-w-3xl gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-11 rounded-full bg-background/70 backdrop-blur-md">
          <Link to="/cuadernillo" aria-label="Volver a la estantería">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 rounded-2xl bg-background/75 px-3 py-1 text-2xl font-semibold backdrop-blur-md">
          <span aria-hidden="true" className="h-6 w-2 rounded-sm" style={{ background: cover.color }} />
          {notebook.title}
        </h1>
        <Button className="ml-auto h-11 rounded-full px-5" onClick={() => void addPage()} disabled={adding}>
          <FilePlus2 aria-hidden="true" />
          Nueva página
        </Button>
      </header>
      {addError && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {addError}
        </p>
      )}

      {!current ? (
        <GlassCard>
          <EmptyState
            title="Este cuaderno está en blanco"
            description="Empieza la primera página: escribe cómo te sientes hoy, con tus palabras."
            action={
              <Button size="lg" className="h-12 rounded-full px-6 text-base" onClick={() => void addPage()} disabled={adding}>
                Escribir la primera página
              </Button>
            }
          />
        </GlassCard>
      ) : (
        <>
          <div className="[perspective:1600px]">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={current.id}
                custom={direction}
                variants={reduced ? undefined : turn}
                initial={reduced ? { opacity: 0 } : "enter"}
                animate={reduced ? { opacity: 1 } : "center"}
                exit={reduced ? { opacity: 0 } : "exit"}
                transition={{ duration: reduced ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: direction > 0 ? "left center" : "right center" }}
                onPanEnd={onSwipe}
              >
                <PageEditor page={current} notebookPaper={notebook.paper} catalog={catalog} onChange={replacePage} />
              </motion.div>
            </AnimatePresence>
          </div>

          <nav aria-label="Páginas del cuaderno" className="flex items-center justify-between gap-3">
            <Button variant="outline" className="h-11 rounded-full px-4" onClick={() => goTo(index - 1)} disabled={index <= 0}>
              <ChevronLeft aria-hidden="true" />
              Anterior
            </Button>
            <span className="rounded-full bg-background/75 px-3 py-1 text-sm font-semibold whitespace-nowrap tabular-nums backdrop-blur-md" aria-live="polite">
              Página {index + 1} de {pages.length}
            </span>
            <Button variant="outline" className="h-11 rounded-full px-4" onClick={() => goTo(index + 1)} disabled={index >= pages.length - 1}>
              Siguiente
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        </>
      )}
    </PageTransition>
  )
}
