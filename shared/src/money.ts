/**
 * Гроші завжди зберігаються в копійках (цілі числа).
 * Форматування - українське: «6 900,00», розряди через нерозривний пробіл.
 */

const ONES_M = ['', 'один', 'два', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять']
const ONES_F = ['', 'одна', 'дві', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять']
const TEENS = [
  'десять',
  'одинадцять',
  'дванадцять',
  'тринадцять',
  'чотирнадцять',
  'п’ятнадцять',
  'шістнадцять',
  'сімнадцять',
  'вісімнадцять',
  'дев’ятнадцять',
]
const TENS = [
  '',
  '',
  'двадцять',
  'тридцять',
  'сорок',
  'п’ятдесят',
  'шістдесят',
  'сімдесят',
  'вісімдесят',
  'дев’яносто',
]
const HUNDREDS = [
  '',
  'сто',
  'двісті',
  'триста',
  'чотириста',
  'п’ятсот',
  'шістсот',
  'сімсот',
  'вісімсот',
  'дев’ятсот',
]

export type Gender = 'm' | 'f'

/** Українська форма множини: 1 гривня, 2 гривні, 5 гривень. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n))
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function triad(n: number, gender: Gender): string {
  const hundreds = Math.floor(n / 100)
  const tens = Math.floor((n % 100) / 10)
  const ones = n % 10
  const parts: string[] = []
  if (hundreds > 0) parts.push(HUNDREDS[hundreds] ?? '')
  if (tens === 1) {
    parts.push(TEENS[ones] ?? '')
  } else {
    if (tens > 1) parts.push(TENS[tens] ?? '')
    if (ones > 0) parts.push((gender === 'f' ? ONES_F : ONES_M)[ones] ?? '')
  }
  return parts.filter(Boolean).join(' ')
}

function group(
  n: number,
  forms: readonly [string, string, string],
  gender: Gender,
): string {
  const words = triad(n, gender)
  if (!words) return ''
  return `${words} ${plural(n, ...forms)}`
}

/** Ціле число словами українською. */
export function intToWords(value: number): string {
  const n = Math.trunc(Math.abs(value))
  if (n === 0) return 'нуль'

  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  const parts: string[] = []
  if (billions > 0) parts.push(group(billions, ['мільярд', 'мільярди', 'мільярдів'], 'm'))
  if (millions > 0) parts.push(group(millions, ['мільйон', 'мільйони', 'мільйонів'], 'm'))
  if (thousands > 0) parts.push(group(thousands, ['тисяча', 'тисячі', 'тисяч'], 'f'))
  // Гривня - жіночого роду: «одна гривня», «двадцять одна гривня».
  if (rest > 0) parts.push(triad(rest, 'f'))

  return parts.filter(Boolean).join(' ')
}

export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export interface AmountInWords {
  /** «Шість тисяч дев’ятсот» */
  words: string
  /** «гривень» */
  hryvniaWord: string
  /** «00» */
  kopecks: string
  /** «копійок» */
  kopecksWord: string
  /** «Шість тисяч дев’ятсот гривень 00 копійок» */
  full: string
}

/** Сума в копійках → сума словами для акта й рахунку. */
export function amountInWordsUAH(minor: number): AmountInWords {
  const safe = Number.isFinite(minor) ? Math.max(0, Math.trunc(minor)) : 0
  const hryvnia = Math.floor(safe / 100)
  const kopecks = safe % 100

  const words = capitalize(intToWords(hryvnia))
  const hryvniaWord = plural(hryvnia, 'гривня', 'гривні', 'гривень')
  const kopecksText = String(kopecks).padStart(2, '0')
  const kopecksWord = plural(kopecks, 'копійка', 'копійки', 'копійок')

  return {
    words,
    hryvniaWord,
    kopecks: kopecksText,
    kopecksWord,
    full: `${words} ${hryvniaWord} ${kopecksText} ${kopecksWord}`,
  }
}

function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

/** «6 900,00» - завжди два знаки після коми. */
export function formatMoney(minor: number): string {
  const safe = Number.isFinite(minor) ? Math.round(minor) : 0
  const sign = safe < 0 ? '-' : ''
  const abs = Math.abs(safe)
  const hryvnia = Math.floor(abs / 100)
  const kopecks = abs % 100
  return `${sign}${groupThousands(hryvnia)},${String(kopecks).padStart(2, '0')}`
}

/** «6 900» або «699,50» - без зайвих нулів у копійках. */
export function formatAmount(minor: number): string {
  // Усі ціни в документах пишуться з копійками (наприклад «6 900,00»).
  return formatMoney(minor)
}

/** Ввід користувача («1 234,5», «1234.50») → копійки. null - некоректно. */
export function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.')
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole = '0', fraction = ''] = cleaned.split('.')
  const value = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2))
  return Number.isSafeInteger(value) ? value : null
}

/** Кількість без зайвих нулів: 23, 1,5, 0,25. */
export function formatQty(qty: number): string {
  const rounded = Math.round(qty * 1000) / 1000
  return String(rounded).replace('.', ',')
}
