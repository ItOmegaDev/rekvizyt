/** Дати зберігаються як ISO-рядки «YYYY-MM-DD» без часових зон. */

const MONTHS_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
]

export const MONTHS_NOMINATIVE = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

export interface DateParts {
  year: number
  month: number
  day: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Розбір ISO-дати з перевіркою, що така дата реально існує. */
export function parseISODate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

export function isValidISODate(value: string): boolean {
  return parseISODate(value) !== null
}

/** «30 жовтня 2026» - без розривів між числом, місяцем і роком. */
export function formatDateLong(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return `${parts.day}\u00A0${MONTHS_GENITIVE[parts.month - 1]}\u00A0${parts.year}`
}

/** «30 жовтня 2026 р.» */
export function formatDateDoc(iso: string): string {
  return `${formatDateLong(iso)} р.`
}

/** «30» жовтня 2026 року */
export function formatDateQuoted(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return `«${parts.day}»\u00A0${MONTHS_GENITIVE[parts.month - 1]}\u00A0${parts.year}\u00A0року`
}

/** «30.10.2026» */
export function formatDateShort(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return `${pad(parts.day)}.${pad(parts.month)}.${parts.year}`
}

/** «2026-10» - ключ місяця для нумерації документів. */
export function monthKey(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso.slice(0, 7)
  return `${parts.year}-${pad(parts.month)}`
}

/** «10» - номер місяця для номера документа «NN-MM». */
export function monthNumber(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso.slice(5, 7)
  return pad(parts.month)
}

/** Локальна дата сьогодні, без зсуву UTC. */
export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** «2026-10-30» → «жовтень 2026» для списків. */
export function formatMonthLabel(yearMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth)
  if (!match) return yearMonth
  const month = Number(match[2])
  const name = MONTHS_NOMINATIVE[month - 1] ?? ''
  return `${name} ${match[1]}`
}
