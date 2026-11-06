/** Edad mínima para usar Evoca (Ley 1581: solo personas adultas). */
export const MINIMUM_AGE = 18

/** Edad cumplida en una fecha (por defecto hoy), con el mismo cálculo que el servidor. */
export function calculateAge(dateOfBirth: string, onDate = new Date()): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number)
  const today = { year: onDate.getFullYear(), month: onDate.getMonth() + 1, day: onDate.getDate() }
  const beforeBirthday = today.month < month || (today.month === month && today.day < day)
  return today.year - year - (beforeBirthday ? 1 : 0)
}

export function isAdult(dateOfBirth: string, onDate = new Date()): boolean {
  return calculateAge(dateOfBirth, onDate) >= MINIMUM_AGE
}

/** Fecha local en formato AAAA-MM-DD (para el atributo max del campo de fecha). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}
