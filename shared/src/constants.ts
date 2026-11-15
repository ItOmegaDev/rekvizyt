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

/** Одиниці, які найчастіше трапляються; поле вводу лишається вільним. */
export const UNIT_SUGGESTIONS = ['шт', 'посл.', 'год', 'міс.', 'компл.'] as const
