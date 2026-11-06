import { Fingerprint } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import { GlassCard } from "@/components/evoca/GlassCard"
import { PinPad } from "@/components/evoca/PinPad"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { authApi } from "@/lib/auth"
import { enableBiometric, isBiometricAvailable } from "@/lib/biometric"

type Step = "create" | "confirm" | "biometric"

/** Crear el PIN de 4 dígitos (dos veces) y, si el dispositivo lo permite, activar la huella o el rostro. */
export function CreatePinPage() {
  const { user, markPinCreated } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>("create")
  const [first, setFirst] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    isBiometricAvailable().then((available) => {
      if (!cancelled) setBiometricAvailable(available)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const finish = () => {
    markPinCreated()
    navigate("/", { replace: true })
  }

  const confirm = async (pin: string) => {
    if (pin !== first) {
      setError("Los PIN no coinciden. Vuelve a crearlo.")
      setErrorKey((key) => key + 1)
      setFirst("")
      setStep("create")
      return
    }
    setBusy(true)
    try {
      await authApi.setPin(pin)
      setBusy(false)
      if (biometricAvailable) setStep("biometric")
      else finish()
    } catch (failure) {
      setBusy(false)
      setError((failure as Error).message)
      setErrorKey((key) => key + 1)
      setStep("create")
    }
  }

  const activateBiometric = async () => {
    if (!user) return
    try {
      await enableBiometric(user)
      finish()
    } catch {
      setError("No se pudo activar. Puedes intentarlo después desde Ajustes.")
    }
  }

  return (
    <GlassCard as="section" aria-label="Proteger tu cuenta" className="px-6 py-8">
      {step === "biometric" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-secondary">
            <Fingerprint aria-hidden="true" className="size-7" />
          </span>
          <h1 className="text-2xl font-semibold">¿Usar tu huella o tu rostro?</h1>
          <p className="max-w-xs text-muted-foreground">
            Así abres Evoca más rápido. Tu PIN sigue funcionando y nada biométrico sale de tu dispositivo.
          </p>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="h-12 w-full rounded-full text-base" onClick={activateBiometric}>
            Activar huella o rostro
          </Button>
          <Button variant="ghost" className="h-11 rounded-full" onClick={finish}>
            Ahora no
          </Button>
        </div>
      ) : (
        <PinPad
          key={step}
          title={step === "create" ? "Crea tu PIN" : "Confirma tu PIN"}
          description={
            step === "create"
              ? "Elige 4 dígitos. Te los pediremos cada vez que abras Evoca."
              : "Escribe los mismos 4 dígitos otra vez."
          }
          error={step === "create" ? error : null}
          errorKey={errorKey}
          busy={busy}
          onComplete={(pin) => {
            if (step === "create") {
              setFirst(pin)
              setError(null)
              setStep("confirm")
            } else void confirm(pin)
          }}
        />
      )}
    </GlassCard>
  )
}
