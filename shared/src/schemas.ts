import { z } from 'zod'
import { COUNTERPARTY_TYPES, LIMITS, VAT_NOTE_DEFAULT } from './constants'
import { isValidISODate } from './date'

const trimmed = (max: number) => z.string().trim().min(1, 'Обов’язкове поле').max(max)
const optionalText = (max: number) => z.string().trim().max(max).default('')

export const idSchema = z.string().uuid('Некоректний ідентифікатор')

export const isoDateSchema = z
  .string()
  .trim()
  .refine(isValidISODate, 'Дата у форматі YYYY-MM-DD')

/** Контрольна сума IBAN за ISO 13616 (mod-97). */
export function isValidIban(iban: string): boolean {
  const normalized = iban.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(normalized)) return false
  const rearranged = normalized.slice(4) + normalized.slice(0, 4)
  const digits = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))
  let remainder = 0
  for (const ch of digits) {
    remainder = (remainder * 10 + Number(ch)) % 97
  }
  return remainder === 1
}

const ibanSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, '').toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^UA\d{27}$/, 'IBAN має містити 29 символів: UA і 27 цифр')
      .refine(isValidIban, 'IBAN не проходить перевірку контрольної суми (mod-97)'),
  )

const taxIdSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$|^\d{10}$/, 'ЄДРПОУ - 8 цифр, РНОКПП/ІПН - 10 цифр')

const mfoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'МФО - 6 цифр')
  .or(z.literal(''))
  .default('')

const emailSchema = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) => value === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    'Некоректна електронна пошта',
  )
  .default('')

/* ─────────────────────────── Мої реквізити ─────────────────────────── */

export const profileInputSchema = z.object({
  label: trimmed(60),
  name: trimmed(LIMITS.maxFieldLength),
  fullName: trimmed(LIMITS.maxFieldLength),
  address: trimmed(LIMITS.maxAddressLength),
  taxId: taxIdSchema,
  iban: ibanSchema,
  bankName: trimmed(LIMITS.maxFieldLength),
  mfo: mfoSchema,
  phone: optionalText(40),
  taxNote: optionalText(160),
  signerName: trimmed(120),
  signerPosition: trimmed(80).default('Фізична особа-підприємець'),
  registrationRecord: optionalText(40),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})
export type ProfileInput = z.infer<typeof profileInputSchema>

/* ────────────────────────────── Замовник ────────────────────────────── */

export const counterpartyInputSchema = z
  .object({
    type: z.enum(COUNTERPARTY_TYPES),
    name: trimmed(LIMITS.maxFieldLength),
    fullName: trimmed(LIMITS.maxAddressLength),
    legalAddress: trimmed(LIMITS.maxAddressLength),
    postalAddress: optionalText(LIMITS.maxAddressLength),
    taxId: taxIdSchema,
    taxIdLabel: trimmed(40),
    ipn: z
      .string()
      .trim()
      .regex(/^\d{10}$|^\d{12}$|^$/, 'ІПН - 10 або 12 цифр')
      .default(''),
    iban: ibanSchema,
    bankName: trimmed(LIMITS.maxFieldLength),
    mfo: mfoSchema,
    phone: optionalText(40),
    email: emailSchema,
    signerPosition: trimmed(80).default('Директор'),
    signerPositionGenitive: trimmed(80).default('директора'),
    signerName: trimmed(120),
    signerNameGenitive: optionalText(160),
    signerGender: z.enum(['m', 'f']).default('m'),
    basis: optionalText(80),
    registrationRecord: optionalText(40),
    preamble: z.string().trim().max(1500).default(''),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    const expected = value.type === 'tov' ? 8 : 10
    if (value.taxId.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taxId'],
        message:
          value.type === 'tov'
            ? 'Для ТОВ потрібен ЄДРПОУ - 8 цифр'
            : 'Для ФОП потрібен РНОКПП/ІПН - 10 цифр',
      })
    }
  })
export type CounterpartyInput = z.infer<typeof counterpartyInputSchema>

/* ─────────────────────────────── Договір ────────────────────────────── */

export const contractInputSchema = z.object({
  number: trimmed(60),
  date: isoDateSchema,
  serviceType: trimmed(500),
  serviceLabel: trimmed(LIMITS.maxItemLabel),
  unit: trimmed(20).default('шт'),
  defaultPriceMinor: z.number().int().min(0).max(LIMITS.maxTotalMinor).nullable().default(null),
  defaultQty: z.number().positive().max(LIMITS.maxQty).nullable().default(null),
  isActive: z.boolean().default(true),
})
export type ContractInput = z.infer<typeof contractInputSchema>

/* ─────────────────────────────── Документ ───────────────────────────── */

const qtySchema = z
  .number()
  .positive('Кількість має бути більшою за нуль')
  .max(LIMITS.maxQty)
  .refine(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6,
    'Не більше трьох знаків після коми',
  )

export const documentItemInputSchema = z.object({
  label: trimmed(LIMITS.maxItemLabel),
  qty: qtySchema,
  unit: trimmed(20),
  unitPriceMinor: z.number().int().min(0).max(LIMITS.maxTotalMinor),
})
export type DocumentItemInput = z.infer<typeof documentItemInputSchema>

export const documentInputSchema = z.object({
  profileId: idSchema,
  contractId: idSchema,
  issuedAt: isoDateSchema,
  /** Порожньо - сервер підставить наступний номер «NN-MM». */
  number: z.string().trim().max(40).default(''),
  items: z.array(documentItemInputSchema).min(1, 'Додайте хоча б одну позицію').max(LIMITS.maxItems),
  vatNote: z.string().trim().max(300).default(VAT_NOTE_DEFAULT),
  note: z.string().trim().max(1000).default(''),
})
export type DocumentInput = z.infer<typeof documentInputSchema>

export const documentListQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>

export const nextNumberQuerySchema = z.object({
  date: isoDateSchema,
})

export const documentPaidSchema = z.object({
  paid: z.boolean(),
  /** ISO-дата оплати; якщо не вказано - сьогодні. */
  paidAt: isoDateSchema.optional(),
})
export type DocumentPaidInput = z.infer<typeof documentPaidSchema>

/* ──────────────────────────────── Вхід ──────────────────────────────── */

export const googleLoginSchema = z.object({
  credential: z.string().min(20).max(5000),
})
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>

export const apiErrorSchema = z.object({ error: z.string() })
export type ApiError = z.infer<typeof apiErrorSchema>
