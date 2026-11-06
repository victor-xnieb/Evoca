import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"

import { EvocaWordmark } from "@/components/evoca/EvocaWordmark"
import { GlassCard } from "@/components/evoca/GlassCard"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

import { TextField } from "./TextField"

interface LocationState {
  from?: string
  notice?: string
}

/** Entrar con correo y contraseña (también sirve si se olvidó el PIN). */
export function LoginPage() {
  const { login, notice: sessionNotice } = useAuth()
  const navigate = useNavigate()
  const state = (useLocation().state ?? {}) as LocationState
  const notice = state.notice ?? sessionNotice
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email || !password) return setError("Escribe tu correo y tu contraseña.")
    setBusy(true)
    setError(null)
    try {
      const user = await login(email, password)
      navigate(user.has_pin ? (state.from ?? "/") : "/crear-pin", { replace: true })
    } catch (failure) {
      setBusy(false)
      setError((failure as Error).message)
    }
  }

  return (
    <GlassCard as="section" aria-labelledby="entrar-titulo" className="px-6 py-8 sm:px-8">
      <p className="text-3xl">
        <EvocaWordmark />
      </p>
      <h1 id="entrar-titulo" className="mt-3 text-2xl font-semibold">
        Entra a tu cuenta
      </h1>
      {notice && (
        <p role="status" className="mt-3 rounded-2xl bg-support p-3 text-sm text-support-ink">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium">
          {error}
        </p>
      )}
      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <TextField
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" size="lg" disabled={busy} className="mt-2 h-12 rounded-full text-base">
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link to="/registro" className="font-semibold text-foreground underline underline-offset-4">
          Créala aquí
        </Link>
      </p>
    </GlassCard>
  )
}
