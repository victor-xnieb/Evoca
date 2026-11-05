const LOCALE = "es-CO"

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
]

/** «hace 2 horas», «ayer», «hace un momento». */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const target = typeof date === "string" ? new Date(date) : date
  const seconds = Math.round((target.getTime() - now.getTime()) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return "hace un momento"
}

export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const target = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", ...options }).format(target)
}

/** Intensidad promedio con una cifra decimal y coma decimal: 3,4. */
export function formatAverage(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value)
}

/** Saludo según la hora local. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}
