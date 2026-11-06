import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"

import { EvocaWordmark } from "@/components/evoca/EvocaWordmark"
import { GlassCard } from "@/components/evoca/GlassCard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { isAdult, toIsoDate } from "@/lib/age"
import { ApiError } from "@/lib/api"
import { HEALTH_DATA_MESSAGE, MINOR_MESSAGE } from "@/lib/messages"

import { TextField } from "./TextField"

type Consent = "accepted_terms" | "accepted_privacy" | "accepted_health_data"

const CONSENTS: Array<{ name: Consent; label: string; detail?: string }> = [
  {
    name: "accepted_health_data",
    label: "Autorizo de forma expresa el tratamiento de mis datos sensibles.",
    detail:
      "Las emociones, su intensidad y los recuerdos que registres son datos sensibles (Ley 1581 de 2012). Evoca los usa solo para mostrarte tu evolución; puedes exportarlos o borrarlos cuando quieras desde Ajustes.",
  },
  { name: "accepted_terms", label: "Acepto los términos de uso de Evoca." },
  { name: "accepted_privacy", label: "Acepto la política de privacidad." },
]

type Errors = Partial<Record<"first_name" | "email" | "password" | "date_of_birth" | Consent | "form", string>>

/** HU1 · Escenario 1: registro solo para mayores de 18 con autorización expresa de datos sensibles. */
export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const summary = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState({ first_name: "", email: "", password: "", date_of_birth: "" })
  const [consents, setConsents] = useState<Record<Consent, boolean>>({
    accepted_terms: false,
    accepted_privacy: false,
    accepted_health_data: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [today] = useState(() => toIsoDate(new Date()))

  const update = (name: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [name]: event.target.value }))

  const showErrors = (next: Errors) => {
    setErrors(next)
    requestAnimationFrame(() => summary.current?.focus())
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found: Errors = {}
    if (!values.email) found.email = "Escribe tu correo electrónico."
    if (!values.password) found.password = "Crea una contraseña."
    if (!values.date_of_birth) found.date_of_birth = "Escribe tu fecha de nacimiento."
    else if (!isAdult(values.date_of_birth)) found.date_of_birth = MINOR_MESSAGE
    if (!consents.accepted_health_data) found.accepted_health_data = HEALTH_DATA_MESSAGE
    if (!consents.accepted_terms) found.accepted_terms = "Acepta los términos de uso para continuar."
    if (!consents.accepted_privacy) found.accepted_privacy = "Acepta la política de privacidad para continuar."
    if (Object.keys(found).length) return showErrors(found)

    setBusy(true)
    try {
      await register({ ...values, ...consents })
      navigate("/crear-pin", { replace: true })
    } catch (error) {
      setBusy(false)
      if (!(error instanceof ApiError)) return showErrors({ form: (error as Error).message })
      const fromServer: Errors = {}
      for (const name of ["first_name", "email", "password", "date_of_birth", ...CONSENTS.map((c) => c.name)] as const) {
        const message = error.fieldErrors[name]?.join(" ")
        if (message) fromServer[name] = message
      }
      if (!Object.keys(fromServer).length) fromServer.form = error.message
      showErrors(fromServer)
    }
  }

  const reasons = Object.values(errors)

  return (
    <GlassCard as="section" aria-labelledby="registro-titulo" className="px-6 py-8 sm:px-8">
      <p className="text-3xl">
        <EvocaWordmark />
      </p>
      <h1 id="registro-titulo" className="mt-3 text-2xl font-semibold">
        Crea tu cuenta
      </h1>
      <p className="mt-1 text-muted-foreground">Tus recuerdos son solo tuyos. Después protegerás la app con un PIN.</p>

      <div ref={summary} tabIndex={-1} className="outline-none" aria-live="assertive">
        {reasons.length > 0 && (
          <div role="alert" className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="font-semibold">No pudimos crear la cuenta:</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <TextField
          id="first_name"
          label="¿Cómo quieres que te llamemos? (opcional)"
          autoComplete="given-name"
          value={values.first_name}
          onChange={update("first_name")}
          error={errors.first_name}
        />
        <TextField
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={update("email")}
          error={errors.email}
        />
        <TextField
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, que no sean solo números ni una clave común."
          value={values.password}
          onChange={update("password")}
          error={errors.password}
        />
        <TextField
          id="date_of_birth"
          label="Fecha de nacimiento"
          type="date"
          max={today}
          hint="Evoca es solo para personas mayores de 18 años."
          value={values.date_of_birth}
          onChange={update("date_of_birth")}
          error={errors.date_of_birth}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold">Autorizaciones</legend>
          {CONSENTS.map((consent) => (
            <div key={consent.name} className="flex flex-col gap-1">
              <div className="flex min-h-11 items-start gap-3">
                <Checkbox
                  id={consent.name}
                  checked={consents[consent.name]}
                  onCheckedChange={(checked) => setConsents((current) => ({ ...current, [consent.name]: checked === true }))}
                  aria-invalid={errors[consent.name] ? true : undefined}
                  aria-describedby={consent.detail ? `${consent.name}-detalle` : undefined}
                  className="mt-1 size-5"
                />
                <Label htmlFor={consent.name} className="leading-snug font-medium">
                  {consent.label}
                </Label>
              </div>
              {consent.detail && (
                <p id={`${consent.name}-detalle`} className="pl-8 text-sm text-muted-foreground">
                  {consent.detail}
                </p>
              )}
              {errors[consent.name] && <p className="pl-8 text-sm font-medium text-destructive">{errors[consent.name]}</p>}
            </div>
          ))}
        </fieldset>

        <Button type="submit" size="lg" disabled={busy} className="mt-2 h-12 rounded-full text-base">
          {busy ? "Creando tu cuenta…" : "Crear mi cuenta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link to="/entrar" className="font-semibold text-foreground underline underline-offset-4">
          Entra aquí
        </Link>
      </p>
    </GlassCard>
  )
}
