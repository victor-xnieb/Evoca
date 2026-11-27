import { formatDate } from "@/lib/format"
import type { Letter } from "@/lib/diary"

/** «27 de mayo de 2027» para una fecha AAAA-MM-DD (al mediodía, para que no cambie de día). */
export const dayLabel = (day: string) => formatDate(`${day}T12:00:00`, { year: "numeric" })

/** Fecha local de hoy como AAAA-MM-DD. */
export function todayIso(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** AAAA-MM-DD sumando días (o años) a hoy. */
export function shiftIso(days: number, years = 0, now = new Date()) {
  const target = new Date(now.getFullYear() + years, now.getMonth(), now.getDate() + days)
  return todayIso(target)
}

/** Días que faltan para una fecha (0 si ya llegó). */
export function daysUntil(day: string, now = new Date()) {
  const [year, month, date] = day.split("-").map(Number)
  const target = new Date(year, month - 1, date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000))
}

/** Cartas cuya fecha llegó y aún no se abren (para el aviso en Inicio). */
export const arrivedLetters = (letters: Letter[]) => letters.filter((letter) => letter.ready && !letter.opened_at)

/** Cómo está la carta, en texto (no solo con el sobre). */
export function letterStatus(letter: Letter) {
  if (letter.opened_at) return `Abierta · se abría el ${dayLabel(letter.opens_on)}`
  if (letter.ready) return "Ya puedes abrirla"
  return `Se abre el ${dayLabel(letter.opens_on)}`
}
