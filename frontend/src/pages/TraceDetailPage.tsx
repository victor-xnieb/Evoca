import { ArrowLeft, Trash2 } from "lucide-react"
import { createElement, useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router"

import { EmotionPicker } from "@/components/evoca/EmotionPicker"
import { EmptyState } from "@/components/evoca/EmptyState"
import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { GlassCard } from "@/components/evoca/GlassCard"
import { IntensityPicker } from "@/components/evoca/IntensityPicker"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCatalog } from "@/hooks/use-catalog"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { MISSING_TRACE_FIELDS, TRACE_DELETED_NOTICE, TRACE_UPDATED_NOTICE } from "@/lib/messages"
import { getSensoryIcon } from "@/lib/sensory"
import { labelOf, tracesApi } from "@/lib/traces"
import type { Trace } from "@/lib/types"

import { NoteField } from "./traces/NoteField"
import { RiskHelp } from "./traces/RiskHelp"

type Field = "note" | "emotion" | "mood_intensity"
type Load = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; trace: Trace }

/** HU3: abrir una huella para cambiar su nota, emoción o intensidad, o borrarla. */
export function TraceDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? ""
  const { catalog } = useCatalog()
  const [load, setLoad] = useState<Load>({ status: "loading" })
  const [form, setForm] = useState({ note: "", emotion: "", mood_intensity: 0 })
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    tracesApi
      .get(id)
      .then((trace) => {
        if (cancelled) return
        setLoad({ status: "ready", trace })
        setForm({ note: trace.note, emotion: trace.emotion, mood_intensity: trace.mood_intensity })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) setLoad({ status: "missing" })
        else setLoad({ status: "error", message: (error as Error).message })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const backToList = (notice: string) => navigate(`/mis-huellas${from}`, { state: { notice } })

  if (load.status === "loading") {
    return (
      <div className="grid min-h-80 place-items-center">
        <EvocaLoader label="Abriendo tu huella" />
      </div>
    )
  }

  if (load.status !== "ready") {
    return (
      <PageTransition className="mx-auto w-full max-w-2xl">
        <GlassCard>
          <EmptyState
            variant={load.status === "error" ? "error" : "empty"}
            illustration="bloom"
            title={load.status === "missing" ? "Esta huella ya no existe" : "No pudimos abrir la huella"}
            description={load.status === "error" ? load.message : "Puede que la hayas borrado."}
            action={
              <Button asChild className="h-11 rounded-full px-5">
                <Link to="/mis-huellas">Ver mis huellas</Link>
              </Button>
            }
          />
        </GlassCard>
      </PageTransition>
    )
  }

  const { trace } = load
  const changed =
    form.note.trim() !== trace.note || form.emotion !== trace.emotion || form.mood_intensity !== trace.mood_intensity

  const update = <K extends keyof typeof form>(name: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.note.trim()) return setErrors({ note: MISSING_TRACE_FIELDS.note })
    setSaving(true)
    try {
      await tracesApi.update(trace.id, {
        note: form.note.trim(),
        emotion: form.emotion,
        mood_intensity: form.mood_intensity,
      })
      backToList(TRACE_UPDATED_NOTICE)
    } catch (error) {
      setSaving(false)
      const found: Partial<Record<Field | "form", string>> = {}
      if (error instanceof ApiError) {
        for (const name of ["note", "emotion", "mood_intensity"] as Field[]) {
          if (error.field(name)) found[name] = error.field(name)
        }
      }
      if (!Object.keys(found).length) found.form = (error as Error).message
      setErrors(found)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await tracesApi.remove(trace.id)
      backToList(TRACE_DELETED_NOTICE)
    } catch (error) {
      setDeleting(false)
      setErrors({ form: (error as Error).message })
    }
  }

  const sensoryLabel = labelOf(catalog?.sensory_types ?? [], trace.sensory_type)

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6">
      <Button asChild variant="ghost" className="h-11 self-start rounded-full bg-background/75 px-4 backdrop-blur-md">
        <Link to={`/mis-huellas${from}`}>
          <ArrowLeft aria-hidden="true" />
          Mis huellas
        </Link>
      </Button>

      <GlassCard as="section" aria-labelledby="detalle-titulo" accent={trace.emotion} className="px-5 py-6 sm:px-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary">
            {createElement(getSensoryIcon(trace.sensory_type), { "aria-hidden": true, className: "size-6" })}
          </span>
          <div>
            <h1 id="detalle-titulo" className="text-2xl font-semibold">
              {sensoryLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              Registrada el {formatDate(trace.happened_at ?? trace.created_at, { year: "numeric" })}
            </p>
          </div>
        </div>

        {errors.form && (
          <p role="alert" className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium">
            {errors.form}
          </p>
        )}

        <form noValidate onSubmit={save} className="flex flex-col gap-7">
          <NoteField
            label="Nota"
            value={form.note}
            onChange={(value) => update("note", value)}
            sensoryType={trace.sensory_type}
            error={errors.note}
          />
          <RiskHelp text={form.note} initialText={trace.note} />
          {catalog && (
            <EmotionPicker
              options={catalog.emotions}
              value={form.emotion}
              onChange={(value) => update("emotion", value)}
              error={errors.emotion}
            />
          )}
          <IntensityPicker
            value={form.mood_intensity}
            onChange={(value) => update("mood_intensity", value)}
            emotion={form.emotion}
            error={errors.mood_intensity}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive" className="h-11 rounded-full px-5">
                  <Trash2 aria-hidden="true" />
                  Borrar huella
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Borrar esta huella?</DialogTitle>
                  <DialogDescription>
                    Desaparecerá de tu lista y de los recuerdos que la incluían. No se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" className="h-11 rounded-full px-5">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={remove}
                    disabled={deleting}
                    className="h-11 rounded-full bg-destructive px-5 text-white hover:bg-destructive/90"
                  >
                    {deleting ? "Borrando…" : "Sí, borrar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button type="submit" size="lg" disabled={!changed || saving} className="h-12 rounded-full px-6 text-base">
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </PageTransition>
  )
}
