import type {
  Counterparty,
  CounterpartySnapshot,
  Contract,
  ContractSnapshot,
  DocumentItem,
  Profile,
  ProfileSnapshot,
} from './types'
import type { DocumentItemInput } from './schemas'

/** Суми рядків рахуються на сервері; клієнт використовує те саме для прев’ю. */
export function calcItemAmount(qty: number, unitPriceMinor: number): number {
  return Math.round(qty * unitPriceMinor)
}

export function calcItems(items: readonly DocumentItemInput[]): DocumentItem[] {
  return items.map((item) => ({
    ...item,
    amountMinor: calcItemAmount(item.qty, item.unitPriceMinor),
  }))
}

export function calcTotal(items: readonly DocumentItem[]): number {
  return items.reduce((sum, item) => sum + item.amountMinor, 0)
}

/** «11-10»: послідовний номер у місяці + номер місяця. */
export function suggestedNumber(seq: number, month: string): string {
  return `${seq}-${month}`
}

const FOP_BASIS =
  'що діє на підставі ст. 42 Конституції України, Глави 5 Цивільного кодексу України, ' +
  'Глави 13 Господарського кодексу України'

/**
 * Вступна фраза замовника в акті.
 * Для ТОВ — «в особі директора …», для ФОП — стандартне посилання на ЄДР.
 */
export function buildCustomerPreamble(c: {
  type: Counterparty['type']
  fullName: string
  signerPositionGenitive: string
  signerNameGenitive: string
  signerGender: 'm' | 'f'
  basis: string
  registrationRecord: string
}): string {
  if (c.type === 'fop') {
    const record = c.registrationRecord
      ? `, запис в Єдиному державному реєстрі юридичних осіб та фізичних осіб – підприємців ${c.registrationRecord}`
      : ''
    return (
      `${c.fullName}, ${FOP_BASIS}${record}, ` +
      'іменоване надалі «Замовник» з однієї сторони, та'
    )
  }

  const pronoun = c.signerGender === 'f' ? 'яка' : 'який'
  const basis = c.basis || 'Статуту'
  return (
    `${c.fullName}, надалі «Замовник», в особі ${c.signerPositionGenitive} ` +
    `${c.signerNameGenitive || c.fullName}, ${pronoun} діє на підставі ${basis}, з однієї сторони, та`
  )
}

/** Вступна фраза виконавця (ФОП) в акті. */
export function buildExecutorPreamble(p: {
  fullName: string
  registrationRecord: string
}): string {
  const record = p.registrationRecord
    ? `, запис в Єдиному державному реєстрі юридичних осіб та фізичних осіб – підприємців ${p.registrationRecord}`
    : ''
  return (
    `${p.fullName}, ${FOP_BASIS}${record}, іменований надалі «Виконавець», з іншої сторони, ` +
    'разом іменовані «Сторони», склали цей Акт про наступне:'
  )
}

export function toProfileSnapshot(profile: Profile): ProfileSnapshot {
  return {
    name: profile.name,
    fullName: profile.fullName,
    address: profile.address,
    taxId: profile.taxId,
    iban: profile.iban,
    bankName: profile.bankName,
    mfo: profile.mfo,
    phone: profile.phone,
    taxNote: profile.taxNote,
    signerName: profile.signerName,
    signerPosition: profile.signerPosition,
    registrationRecord: profile.registrationRecord,
  }
}

export function toCounterpartySnapshot(counterparty: Counterparty): CounterpartySnapshot {
  return {
    type: counterparty.type,
    name: counterparty.name,
    fullName: counterparty.fullName,
    legalAddress: counterparty.legalAddress,
    postalAddress: counterparty.postalAddress,
    taxId: counterparty.taxId,
    taxIdLabel: counterparty.taxIdLabel,
    ipn: counterparty.ipn,
    iban: counterparty.iban,
    bankName: counterparty.bankName,
    mfo: counterparty.mfo,
    phone: counterparty.phone,
    email: counterparty.email,
    signerPosition: counterparty.signerPosition,
    signerName: counterparty.signerName,
    signerGender: counterparty.signerGender,
  }
}

export function toContractSnapshot(contract: Contract): ContractSnapshot {
  return {
    number: contract.number,
    date: contract.date,
    serviceType: contract.serviceType,
    serviceLabel: contract.serviceLabel,
    unit: contract.unit,
  }
}
