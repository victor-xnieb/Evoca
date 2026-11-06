import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { EmotionPicker } from "@/components/evoca/EmotionPicker"
import { EmptyState } from "@/components/evoca/EmptyState"
import { EvocaLoader } from "@/components/evoca/EvocaLoader"
import { GlassCard } from "@/components/evoca/GlassCard"
import { GuidedExample } from "@/components/evoca/GuidedExample"
import { IntensityPicker } from "@/components/evoca/IntensityPicker"
import { LottieIllustration } from "@/components/evoca/LottieIllustration"
import { PageTransition } from "@/components/evoca/PageTransition"
import { SensoryTypePicker } from "@/components/evoca/SensoryTypePicker"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useCatalog } from "@/hooks/use-catalog"
import { ApiError } from "@/lib/api"
import { MISSING_TRACE_FIELDS, NOTE_MAX_LENGTH, NOTE_PLACEHOLDERS } from "@/lib/messages"
import { tracesApi } from "@/lib/traces"

type Field = keyof typeof MISSING_TRACE_FIELDS

const exampleKey = (userId: string) => `evoca.ejemplo-visto.${userId}`

function exampleSeen(userId: string) {
  try {
    return window.localStorage.getItem(exampleKey(userId)) !== null
  } catch {
    return false
  }
}

/**
 * HU2: registrar una huella en segundos. Tipo, nota, emoción e intensidad en una sola
 * pantalla; la primera vez se muestra antes un ejemplo guiado que se puede omitir.
 */
export function NewTracePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { catalog, error: catalogError, retry } = useCatalog()
  const noteId = useId()
  const summary = useRef<HTMLDivElement>(null)
  const noteInput = useRef<HTMLTextAreaElement>(null)
  const [showExample, setShowExample] = useState<boolean | null>(() => (user && exampleSeen(user.id) ? false : null))
  const [form, setForm] = useState<{ sensory_type: string | null; note: string; emotion: string | null; mood_intensity: number | null }>(
    { sensory_type: null, note: "", emotion: null, mood_intensity: null },
  )
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({})
  const [saving, setSaving] = useState(false)

  // Primera vez = todavía no tiene huellas y no ha visto el ejemplo en este dispositivo.
  useEffect(() => {
    if (showExample !== null) return
    let cancelled = false
    tracesApi
      .recent()
      .then((page) => {
        if (!cancelled) setShowExample(page.count === 0)
      })
      .catch(() => {
        if (!cancelled) setShowExample(false)
      })
    return () => {
      cancelled = true
    }
  }, [showExample])

  const closeExample = () => {
    if (user) {
      try {
        window.localStorage.setItem(exampleKey(user.id), "1")
      } catch {
        // Sin almacenamiento, el ejemplo podría volver a aparecer: no es grave.
      }
    }
    setShowExample(false)
  }

  const update = <K extends keyof typeof form>(name: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const missing: Partial<Record<Field, string>> = {}
    if (!form.sensory_type) missing.sensory_type = MISSING_TRACE_FIELDS.sensory_type
    if (!form.note.trim()) missing.note = MISSING_TRACE_FIELDS.note
    if (!form.emotion) missing.emotion = MISSING_TRACE_FIELDS.emotion
    if (!form.mood_intensity) missing.mood_intensity = MISSING_TRACE_FIELDS.mood_intensity
    if (Object.keys(missing).length) {
      setErrors(missing)
      requestAnimationFrame(() => summary.current?.focus())
      return
    }

    setSaving(true)
    try {
      const trace = await tracesApi.create({
        sensory_type: form.sensory_type!,
        note: form.note.trim(),
        emotion: form.emotion!,
        mood_intensity: form.mood_intensity!,
      })
      navigate("/", { state: { savedTraceId: trace.id } })
    } catch (error) {
      setSaving(false)
      const fromServer: Partial<Record<Field | "form", string>> = {}
      if (error instanceof ApiError) {
        for (const name of Object.keys(MISSING_TRACE_FIELDS) as Field[]) {
          if (error.field(name)) fromServer[name] = error.field(name)
        }
      }
      if (!Object.keys(fromServer).length) fromServer.form = (error as Error).message
      setErrors(fromServer)
    }
  }

  if (catalogError) {
    return (
      <PageTransition className="mx-auto w-full max-w-2xl">
        <GlassCard>
          <EmptyState
            variant="error"
            title="No pudimos abrir «Nueva huella»"
            description={catalogError}
            action={
              <Button className="h-11 rounded-full px-5" onClick={retry}>
                Reintentar
              </Button>
            }
          />
        </GlassCard>
      </PageTransition>
    )
  }

  if (!catalog || showExample === null) {
    return (
      <div className="grid min-h-80 place-items-center">
        <EvocaLoader label="Preparando tu huella" />
      </div>
    )
  }

  if (showExample) {
    return (
      <PageTransition className="mx-auto w-full max-w-xl">
        <GuidedExample onDone={closeExample} />
      </PageTransition>
    )
  }

  if (saving) {
    return (
      <PageTransition className="mx-auto w-full max-w-xl">
        <GlassCard className="flex flex-col items-center gap-3 px-6 py-12 text-center" aria-live="polite">
          <LottieIllustration name="bloom" className="w-40" />
          <p className="text-lg font-semibold">Guardando tu huella…</p>
        </GlassCard>
      </PageTransition>
    )
  }

  const missingList = Object.entries(errors).filter(([, message]) => message)

  return (
    <PageTransition className="mx-auto w-full max-w-2xl gap-6">
      <h1 className="self-start rounded-2xl bg-background/75 px-3 py-1 text-3xl font-semibold backdrop-blur-md">
        Nueva huella
      </h1>

      <GlassCard as="section" aria-label="Datos de la huella" className="px-5 py-6 sm:px-7">
        <div ref={summary} tabIndex={-1} className="outline-none">
          {missingList.length > 0 && (
            <div role="alert" className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="font-semibold">{errors.form ? "No pudimos guardar la huella:" : "Para guardar falta:"}</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {missingList.map(([name, message]) => (
                  <li key={name}>{message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form noValidate onSubmit={submit} className="flex flex-col gap-7">
          <SensoryTypePicker
            options={catalog.sensory_types}
            value={form.sensory_type}
            onChange={(value) => {
              update("sensory_type", value)
              requestAnimationFrame(() => noteInput.current?.focus())
            }}
            error={errors.sensory_type}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor={noteId} className="text-base font-semibold">
              Escribe una nota corta
            </label>
            <textarea
              id={noteId}
              ref={noteInput}
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              value={form.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder={NOTE_PLACEHOLDERS[form.sensory_type ?? "default"] ?? NOTE_PLACEHOLDERS.default}
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={`${noteId}-contador`}
              className="min-h-24 w-full resize-y rounded-2xl border border-input bg-background/70 px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
            />
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-destructive">{errors.note}</span>
              <span id={`${noteId}-contador`} className="text-muted-foreground tabular-nums">
                {form.note.length}/{NOTE_MAX_LENGTH}
              </span>
            </div>
          </div>

          <EmotionPicker
            options={catalog.emotions}
            value={form.emotion}
            onChange={(value) => update("emotion", value)}
            error={errors.emotion}
          />

          <IntensityPicker
            value={form.mood_intensity}
            onChange={(value) => update("mood_intensity", value)}
            emotion={form.emotion ?? undefined}
            error={errors.mood_intensity}
          />

          <Button type="submit" size="lg" className="h-12 rounded-full text-base" data-cursor-label="Guardar">
            Guardar huella
          </Button>
        </form>
      </GlassCard>
    </PageTransition>
  )
}
