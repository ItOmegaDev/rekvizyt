/** Спільні обмеження для клієнта, сервера й валідації. */

export const LIMITS = {
  maxFieldLength: 200,
  maxAddressLength: 300,
  maxItemLabel: 300,
  maxItems: 50,
  maxQty: 1_000_000,
  maxTotalMinor: 999_999_999_99,
} as const

export const COUNTERPARTY_TYPES = ['tov', 'fop'] as const
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number]

export const VAT_NOTE_DEFAULT = 'Без ПДВ (ПДВ не передбачений).'

/** Автор проєкту - показується в інтерфейсі, `/api/health` і документації. */
export const AUTHOR = {
  name: 'itomegadev',
  url: 'https://github.com/ItOmegaDev',
} as const

/** Визначає назву податкового номера за його довжиною (з реквізитів). */
export function inferTaxIdLabel(taxId: string): string {
  const digits = (taxId || '').replace(/\D/g, '')
  if (digits.length === 8) return 'ЄДРПОУ'
  if (digits.length === 10) return 'РНОКПП'
  if (digits.length > 0) return 'Податковий номер'
  return ''
}

/** Одиниці, які найчастіше трапляються; поле вводу лишається вільним. */
export const UNIT_SUGGESTIONS = ['шт', 'посл.', 'год', 'міс.', 'компл.'] as const
