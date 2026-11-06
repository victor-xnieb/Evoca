/*
 * Desbloqueo con huella o rostro mediante WebAuthn (autenticador de la plataforma).
 * Se usa como verificación local del dispositivo para abrir la app: la credencial queda
 * asociada a este navegador y su identificador se guarda en localStorage. El PIN sigue
 * siendo el respaldo y el servidor nunca recibe datos biométricos.
 */

const KEY_PREFIX = "evoca.biometric."

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`
}

function toBase64Url(buffer: ArrayBuffer) {
  let binary = ""
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function challenge() {
  return crypto.getRandomValues(new Uint8Array(32))
}

/** true si el dispositivo tiene huella o rostro disponibles para la web. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricEnabled(userId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(userId)) !== null
  } catch {
    return false
  }
}

/** Registra la huella o el rostro de este dispositivo para la cuenta. */
export async function enableBiometric(user: { id: string; email: string; first_name?: string }) {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: "Evoca" },
      user: {
        id: new TextEncoder().encode(user.id),
        name: user.email,
        displayName: user.first_name || user.email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!credential) throw new Error("No se activó la huella o el rostro.")
  window.localStorage.setItem(storageKey(user.id), toBase64Url(credential.rawId))
}

/** Pide la huella o el rostro. Resuelve true si el dispositivo verificó a la persona. */
export async function verifyBiometric(userId: string): Promise<boolean> {
  const stored = window.localStorage.getItem(storageKey(userId))
  if (!stored) return false
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        allowCredentials: [{ type: "public-key", id: fromBase64Url(stored), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60_000,
      },
    })
    return assertion !== null
  } catch {
    return false
  }
}

export function disableBiometric(userId: string) {
  try {
    window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Nada que borrar.
  }
}
