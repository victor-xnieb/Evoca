import { ArrowLeft, Stamp } from "lucide-react"
import { motion } from "motion/react"
import { useId, useState, type CSSProperties, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router"

import { Envelope } from "@/components/evoca/Envelope"
import { PageTransition } from "@/components/evoca/PageTransition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { ApiError } from "@/lib/api"
import { diaryApi, FONTS, fontOf, fontSizeOf, INKS, inkVar, type DiaryFont, type Ink, type Letter } from "@/lib/diary"

import { RiskHelp } from "../traces/RiskHelp"
import { dayLabel, shiftIso, todayIso } from "./letters"

import "@fontsource/caveat/400.css"
import "@fontsource/patrick-hand/400.css"
import "@fontsource/kalam/400.css"
import "@fontsource/indie-flower/400.css"
import "@/styles/diary.css"

/**
 * HU19 · Escenario 1: escribo una carta a mi yo del futuro, elijo cuándo se abre y la sello. Ya
 * sellada no se puede leer ni cambiar hasta esa fecha.
 */
export function LetterWritePage() {
  const reduced = useReducedMotion()
  // «Sellar otra carta» desde una carta abierta: la nueva sigue a esa.
  const follows = useSearchParams()[0].get("desde") ?? undefined
  const textId = useId()
  const dateId = useId()
  const fontId = useId()
  const [content, setContent] = useState("")
  const [opensOn, setOpensOn] = useState("")
  const [font, setFont] = useState<DiaryFont>("caveat")
  const [ink, setInk] = useState<Ink>("sepia")
  const [errors, setErrors] = useState<{
    content?: string
    opens_on?: string
    form?: string
  }>({})
  const [saving, setSaving] = useState(false)
  const [sealed, setSealed] = useState<Letter | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const local = {
      content: content.trim() ? undefined : "Escribe tu carta antes de sellarla.",
      opens_on: opensOn ? undefined : "Elige cuándo se abre.",
    }
    if (local.content || local.opens_on) return setErrors(local)
    setSaving(true)
    setErrors({})
    try {
      setSealed(
        await diaryApi.sealLetter({
          content: content.trim(),
          opens_on: opensOn,
          font,
          ink,
          follows,
        }),
      )
    } catch (problem) {
      const error = problem as Error
      if (error instanceof ApiError && (error.field("content") || error.field("opens_on"))) {
        setErrors({
          content: error.field("content"),
          opens_on: error.field("opens_on"),
        })
      } else {
        setErrors({ form: error.message })
      }
    } finally {
      setSaving(false)
    }
  }

  if (sealed) {
    return (
      <PageTransition className="mx-auto w-full max-w-md items-center gap-6 text-center">
        <Envelope state="sealed" stamp className="max-w-sm" />
        <motion.div
          className="flex flex-col items-center gap-3 rounded-3xl bg-background/80 px-5 py-4 backdrop-blur-md"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.1 }}
        >
          <h1 className="text-2xl font-semibold">Carta sellada</h1>
          <p role="status" className="text-base">
            Se abre el {dayLabel(sealed.opens_on)}. Hasta entonces, nadie puede leerla; ni siquiera tú.
          </p>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/cuadernillo">Volver al Cuadernillo</Link>
          </Button>
        </motion.div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="mx-auto w-full max-w-3xl gap-5">
      <div className="flex flex-col gap-2 self-start rounded-2xl bg-background/75 px-3 py-2 backdrop-blur-md">
        <Link
          to="/cuadernillo"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Cuadernillo
        </Link>
        <h1 className="text-3xl font-semibold">Carta a mi yo del futuro</h1>
        <p className="text-base text-muted-foreground">Escríbele a quien serás. Quedará sellada hasta el día que elijas.</p>
        {follows && <p className="text-sm font-semibold">Esta carta seguirá a la que acabas de leer.</p>}
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-4 rounded-3xl bg-background/80 p-4 text-sm backdrop-blur-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={dateId} className="font-semibold">
              Se abre el
            </label>
            <Input
              id={dateId}
              type="date"
              value={opensOn}
              min={shiftIso(1)}
              max={shiftIso(0, 10)}
              onChange={(event) => setOpensOn(event.target.value)}
              aria-invalid={!!errors.opens_on}
              aria-describedby={`${dateId}-ayuda`}
              className="h-11 w-auto"
            />
            <span id={`${dateId}-ayuda`} className={errors.opens_on ? "font-semibold text-destructive" : "text-xs text-muted-foreground"}>
              {errors.opens_on ?? "Desde mañana y hasta dentro de 10 años."}
            </span>
          </div>
          <label htmlFor={fontId} className="flex flex-col gap-1.5">
            <span className="font-semibold">Letra</span>
            <select
              id={fontId}
              value={font}
              onChange={(event) => setFont(event.target.value as DiaryFont)}
              className="h-11 rounded-xl border border-input bg-background px-2"
            >
              {FONTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 font-semibold">Tinta</legend>
            <div className="flex items-center gap-1.5">
              {INKS.map((item) => (
                <label key={item.value} className="cursor-pointer" title={item.label}>
                  <input
                    type="radio"
                    name="tinta"
                    value={item.value}
                    checked={ink === item.value}
                    onChange={() => setInk(item.value)}
                    className="peer sr-only"
                  />
                  <span
                    className="block size-9 rounded-full border-2 border-transparent peer-checked:border-foreground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                    style={{
                      background: inkVar(item.value),
                    }}
                  />
                  <span className="sr-only">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <article
          className="diary-paper overflow-hidden rounded-3xl px-6 pt-8 pb-10 sm:px-10"
          style={
            {
              "--diary-ink": inkVar(ink),
              "--diary-size": fontSizeOf(font),
              fontFamily: fontOf(font).family,
            } as CSSProperties
          }
        >
          <div aria-hidden="true" className="diary-lines pointer-events-none absolute inset-0" />
          <p className="relative mb-2 font-sans text-sm font-semibold text-(--diary-ink) opacity-80">Escrita el {dayLabel(todayIso())}</p>
          <label htmlFor={textId} className="sr-only">
            Tu carta
          </label>
          <textarea
            id={textId}
            value={content}
            maxLength={20000}
            rows={10}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Querida yo del futuro…"
            aria-invalid={!!errors.content}
            aria-describedby={errors.content ? `${textId}-error` : undefined}
            className="relative block min-h-80 w-full resize-y bg-transparent text-(--diary-ink) outline-none placeholder:text-(--diary-ink) placeholder:opacity-45 focus-visible:outline-none"
            style={{
              fontSize: "var(--diary-size)",
              lineHeight: "var(--line-gap)",
            }}
          />
          {errors.content && (
            <p id={`${textId}-error`} className="relative font-sans text-sm font-semibold text-destructive">
              {errors.content}
            </p>
          )}
        </article>

        <div className="flex flex-col items-start gap-2 rounded-3xl bg-background/80 p-4 backdrop-blur-md">
          <p className="text-sm text-muted-foreground">
            {opensOn
              ? `Al sellarla no podrás leerla ni cambiarla hasta el ${dayLabel(opensOn)}.`
              : "Al sellarla no podrás leerla ni cambiarla hasta la fecha que elijas."}
          </p>
          {errors.form && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {errors.form}
            </p>
          )}
          <Button type="submit" size="lg" className="h-12 rounded-full px-6 text-base" disabled={saving}>
            <Stamp aria-hidden="true" />
            {saving ? "Sellando…" : "Sellar carta"}
          </Button>
        </div>
      </form>

      <RiskHelp text={content} closeLabel="Volver a mi carta" />
    </PageTransition>
  )
}
