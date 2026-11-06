import { Fingerprint, KeyRound, LogOut } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { GlassCard } from "@/components/evoca/GlassCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth"
import { disableBiometric, enableBiometric, isBiometricAvailable, isBiometricEnabled } from "@/lib/biometric"
import { TextField } from "@/pages/auth/TextField"

function ChangePinDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ password: "", pin: "", repeat: "" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{4}$/.test(form.pin)) return setError("El PIN debe tener exactamente 4 dígitos.")
    if (form.pin !== form.repeat) return setError("Los PIN no coinciden.")
    setBusy(true)
    try {
      await authApi.setPin(form.pin, form.password)
      setOpen(false)
      setForm({ password: "", pin: "", repeat: "" })
      onDone()
    } catch (failure) {
      setError(failure instanceof ApiError ? (failure.field("password") ?? failure.message) : (failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const pinField = { type: "password", inputMode: "numeric" as const, maxLength: 4, autoComplete: "off" }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 rounded-full px-5">
          <KeyRound aria-hidden="true" />
          Cambiar PIN
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Cambiar tu PIN</DialogTitle>
            <DialogDescription>Por seguridad, primero escribe la contraseña de tu cuenta.</DialogDescription>
          </DialogHeader>
          <TextField
            id="pin-password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <TextField
            id="pin-new"
            label="Nuevo PIN (4 dígitos)"
            {...pinField}
            value={form.pin}
            onChange={(event) => setForm({ ...form, pin: event.target.value.replace(/\D/g, "") })}
          />
          <TextField
            id="pin-repeat"
            label="Repite el nuevo PIN"
            {...pinField}
            value={form.repeat}
            onChange={(event) => setForm({ ...form, repeat: event.target.value.replace(/\D/g, "") })}
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy} className="h-11 rounded-full px-5">
              {busy ? "Guardando…" : "Guardar PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Seguridad: PIN, huella o rostro de este dispositivo y cerrar sesión. */
export function SecuritySection() {
  const { user, logout } = useAuth()
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(() => (user ? isBiometricEnabled(user.id) : false))
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    isBiometricAvailable().then((value) => {
      if (!cancelled) setAvailable(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleBiometric = async () => {
    if (!user) return
    if (enabled) {
      disableBiometric(user.id)
      setEnabled(false)
      setNotice("Desactivamos la huella o el rostro en este dispositivo.")
      return
    }
    try {
      await enableBiometric(user)
      setEnabled(true)
      setNotice("Listo: puedes abrir Evoca con tu huella o tu rostro.")
    } catch {
      setNotice("No se pudo activar la huella o el rostro en este dispositivo.")
    }
  }

  const signOut = () => logout()

  return (
    <GlassCard as="section" aria-labelledby="seguridad" className="flex flex-col gap-4 p-5">
      <div>
        <h2 id="seguridad" className="text-xl font-semibold">
          Seguridad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Evoca te pide tu PIN cada vez que la abres o vuelves a ella. Tras 5 intentos fallidos, el acceso se
          bloquea 5 minutos.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <ChangePinDialog onDone={() => setNotice("Tu PIN se actualizó.")} />
        {available && (
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={toggleBiometric}>
            <Fingerprint aria-hidden="true" />
            {enabled ? "Desactivar huella o rostro" : "Activar huella o rostro"}
          </Button>
        )}
        <Button variant="ghost" className="h-11 rounded-full px-5" onClick={signOut}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
      {notice && (
        <p role="status" className="text-sm font-medium">
          {notice}
        </p>
      )}
    </GlassCard>
  )
}
