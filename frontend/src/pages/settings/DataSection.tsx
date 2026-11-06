import { Download, Trash2 } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { GlassCard } from "@/components/evoca/GlassCard"
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
import { useAuth } from "@/hooks/use-auth"
import { ApiError } from "@/lib/api"
import { authApi, downloadJson, exportFileName, type Consent } from "@/lib/auth"
import { disableBiometric } from "@/lib/biometric"
import { formatDate } from "@/lib/format"
import { ACCOUNT_DELETED_NOTICE } from "@/lib/messages"
import { TextField } from "@/pages/auth/TextField"

function DeleteAccountDialog() {
  const { user, endSession } = useAuth()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!password) return setError("Escribe tu contraseña para confirmar.")
    setBusy(true)
    try {
      await authApi.deleteAccount(password)
      if (user) disableBiometric(user.id)
      endSession(ACCOUNT_DELETED_NOTICE)
    } catch (failure) {
      setBusy(false)
      setError(failure instanceof ApiError ? (failure.field("password") ?? failure.message) : (failure as Error).message)
    }
  }

  return (
    <Dialog onOpenChange={() => setError(null)}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="h-11 rounded-full px-5">
          <Trash2 aria-hidden="true" />
          Eliminar mi cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Se borrarán para siempre tu cuenta, tus huellas, tus memorias, tus autorizaciones y tu PIN. No se
              puede deshacer. Si quieres conservar una copia, exporta tus datos antes.
            </DialogDescription>
          </DialogHeader>
          <TextField
            id="delete-password"
            label="Escribe tu contraseña para confirmar"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error ?? undefined}
          />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="h-11 rounded-full px-5">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={busy}
              className="h-11 rounded-full bg-destructive px-5 text-white hover:bg-destructive/90"
            >
              {busy ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Tus datos: la autorización dada (fecha y versión), exportar y eliminar la cuenta. */
export function DataSection() {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    authApi
      .consents()
      .then((consents) => {
        if (!cancelled) setConsent(consents.find((item) => item.consent_type === "health_data") ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const exportData = async () => {
    setBusy(true)
    try {
      const data = await authApi.exportData()
      const name = exportFileName()
      downloadJson(data, name)
      setNotice(`Descargamos tus datos en el archivo ${name}.`)
    } catch (failure) {
      setNotice((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard as="section" aria-labelledby="tus-datos" className="flex flex-col gap-4 p-5">
      <div>
        <h2 id="tus-datos" className="text-xl font-semibold">
          Tus datos
        </h2>
        {consent && (
          <p className="mt-1 text-sm text-muted-foreground">
            Autorizaste el tratamiento de tus datos sensibles el{" "}
            {formatDate(consent.accepted_at, { year: "numeric" })} (versión {consent.document_version}).
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="h-11 rounded-full px-5" onClick={exportData} disabled={busy}>
          <Download aria-hidden="true" />
          {busy ? "Preparando el archivo…" : "Exportar mis datos"}
        </Button>
        <DeleteAccountDialog />
      </div>
      {notice && (
        <p role="status" className="text-sm font-medium">
          {notice}
        </p>
      )}
    </GlassCard>
  )
}
