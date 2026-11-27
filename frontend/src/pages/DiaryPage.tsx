import { Plus } from "lucide-react"
import { useEffect, useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { EmotionOrbCluster } from "@/components/evoca/EmotionOrbCluster"
import { EmptyState } from "@/components/evoca/EmptyState"
import { GlassCard } from "@/components/evoca/GlassCard"
import { NotebookCover } from "@/components/evoca/NotebookCover"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { COVERS, diaryApi, PAPERS, type Cover, type Notebook, type Paper } from "@/lib/diary"
import { cn } from "@/lib/utils"

import "@/styles/diary.css"

type ShelfState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; notebooks: Notebook[] }

function NewNotebookDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (notebook: Notebook) => void }) {
  const titleId = useId()
  const [title, setTitle] = useState("")
  const [cover, setCover] = useState<Cover>("terracota")
  const [paper, setPaper] = useState<Paper>("lined")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError("Ponle un título a tu cuaderno.")
    setSaving(true)
    setError(null)
    try {
      onCreated(await diaryApi.createNotebook({ title: title.trim(), cover, paper }))
      setTitle("")
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nuevo cuaderno</DialogTitle>
            <DialogDescription>Elige su nombre, el color de la portada y el papel de sus páginas.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={titleId} className="text-sm font-semibold">
              Título
            </label>
            <Input id={titleId} value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} placeholder="Mi diario" className="h-11" />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Portada</legend>
            <div className="flex flex-wrap gap-2">
              {COVERS.map((item) => (
                <label key={item.value} className="cursor-pointer">
                  <input type="radio" name="cover" value={item.value} checked={cover === item.value} onChange={() => setCover(item.value)} className="peer sr-only" />
                  <span
                    className="block size-11 rounded-xl border-2 border-transparent ring-offset-2 peer-checked:border-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring"
                    style={{ background: item.color }}
                    title={item.label}
                  />
                  <span className="sr-only">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Papel</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAPERS.map((item) => (
                <label
                  key={item.value}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-ring",
                    paper === item.value ? "border-foreground bg-secondary" : "bg-card",
                  )}
                >
                  <input type="radio" name="paper" value={item.value} checked={paper === item.value} onChange={() => setPaper(item.value)} className="sr-only" />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" className="h-11 rounded-full px-6" disabled={saving}>
              {saving ? "Creando…" : "Crear cuaderno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** HU17: «Cuadernillo», la estantería de mis cuadernos. */
export function DiaryPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ShelfState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const run = { cancelled: false }
    diaryApi
      .notebooks()
      .then((notebooks) => {
        if (!run.cancelled) setState({ status: "ready", notebooks })
      })
      .catch((error: Error) => {
        if (!run.cancelled) setState({ status: "error", message: error.message })
      })
    return () => {
      run.cancelled = true
    }
  }, [attempt])

  return (
    <PageTransition className="mx-auto w-full max-w-3xl gap-6">
      <header className="flex flex-col gap-2 self-start rounded-2xl bg-background/75 px-3 py-2 backdrop-blur-md">
        <h1 className="text-3xl font-semibold">Cuadernillo</h1>
        <p className="text-base text-muted-foreground">Evoca guarda lo que sentiste; aquí guardas cómo lo cuentas, con tus palabras.</p>
      </header>

      {state.status === "loading" && (
        <div aria-busy="true" aria-label="Cargando tus cuadernos" className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <GlassCard>
          <EmptyState
            variant="error"
            title="No pudimos abrir tu cuadernillo"
            description={state.message}
            action={
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => {
                  setState({ status: "loading" })
                  setAttempt((value) => value + 1)
                }}
              >
                Intentar de nuevo
              </Button>
            }
          />
        </GlassCard>
      )}

      {state.status === "ready" && state.notebooks.length === 0 && (
        <GlassCard>
          <EmptyState
            visual={<EmotionOrbCluster size={120} />}
            title="Tu estantería está vacía"
            description="Crea tu primer cuaderno: elige su portada y su papel, y escribe cómo te sientes."
            action={
              <Button size="lg" className="h-12 rounded-full px-6 text-base" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                Crear mi primer cuaderno
              </Button>
            }
          />
        </GlassCard>
      )}

      {state.status === "ready" && state.notebooks.length > 0 && (
        <section aria-labelledby="estanteria" className="flex flex-col gap-4">
          <h2 id="estanteria" className="sr-only">
            Mi estantería
          </h2>
          <ul aria-label="Mis cuadernos" className="grid grid-cols-2 gap-5 rounded-3xl bg-background/60 p-4 backdrop-blur-md sm:grid-cols-3">
            {state.notebooks.map((notebook) => (
              <li key={notebook.id}>
                <NotebookCover notebook={notebook} onOpen={() => navigate(`/cuadernillo/${notebook.id}`)} />
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-ring hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring"
              >
                <Plus aria-hidden="true" className="size-6" />
                Nuevo cuaderno
              </button>
            </li>
          </ul>
        </section>
      )}

      <NewNotebookDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(notebook) => {
          setCreating(false)
          navigate(`/cuadernillo/${notebook.id}`)
        }}
      />
    </PageTransition>
  )
}
