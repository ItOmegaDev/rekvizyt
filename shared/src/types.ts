import type { CounterpartyType } from './constants'

export interface PublicConfig {
  googleClientId: string
  devLogin: boolean
}

export interface HealthResponse {
  status: 'ok'
  uptimeSeconds: number
  db: 'connected' | 'disconnected'
  author: string
}

export interface Profile {
  id: string
  label: string
  name: string
  fullName: string
  address: string
  taxId: string
  iban: string
  bankName: string
  mfo: string
  phone: string
  taxNote: string
  signerName: string
  signerPosition: string
  registrationRecord: string
  isDefault: boolean
  isActive: boolean
}

export interface Counterparty {
  id: string
  type: CounterpartyType
  name: string
  fullName: string
  legalAddress: string
  postalAddress: string
  taxId: string
  taxIdLabel: string
  ipn: string
  iban: string
  bankName: string
  mfo: string
  phone: string
  email: string
  signerPosition: string
  signerPositionGenitive: string
  signerName: string
  signerNameGenitive: string
  signerGender: 'm' | 'f'
  basis: string
  registrationRecord: string
  preamble: string
  isActive: boolean
}

export interface Contract {
  id: string
  counterpartyId: string
  number: string
  date: string
  serviceType: string
  serviceLabel: string
  unit: string
  defaultPriceMinor: number | null
  defaultQty: number | null
  isActive: boolean
}

export interface CounterpartyWithContracts extends Counterparty {
  contracts: Contract[]
}

export interface DocumentItem {
  label: string
  qty: number
  unit: string
  unitPriceMinor: number
  amountMinor: number
}

export interface ProfileSnapshot {
  name: string
  fullName: string
  address: string
  taxId: string
  iban: string
  bankName: string
  mfo: string
  phone: string
  taxNote: string
  signerName: string
  signerPosition: string
  registrationRecord: string
}

export interface CounterpartySnapshot {
  type: CounterpartyType
  name: string
  fullName: string
  legalAddress: string
  postalAddress: string
  taxId: string
  taxIdLabel: string
  ipn: string
  iban: string
  bankName: string
  mfo: string
  phone: string
  email: string
  signerPosition: string
  signerName: string
  signerGender: 'm' | 'f'
}

export interface ContractSnapshot {
  number: string
  date: string
  serviceType: string
  serviceLabel: string
  unit: string
}

export interface DocumentSummary {
  id: string
  number: string
  issuedAt: string
  totalMinor: number
  counterpartyName: string
  counterpartyFullName: string
  contractNumber: string
  serviceType: string
  createdAt: string
  /** ISO-дата оплати або null, якщо не сплачено. */
  paidAt: string | null
}

export interface DocumentDetail {
  id: string
  number: string
  issuedAt: string
  items: DocumentItem[]
  totalMinor: number
  vatNote: string
  note: string
  profileId: string
  counterpartyId: string
  contractId: string
  customerPreamble: string
  executorPreamble: string
  profile: ProfileSnapshot
  counterparty: CounterpartySnapshot
  contract: ContractSnapshot
  createdAt: string
  updatedAt: string
  /** ISO-дата оплати або null, якщо не сплачено. */
  paidAt: string | null
}

export interface NextNumber {
  number: string
}

export interface OkResponse {
  ok: true
  /** Запис використовується в документах - його вимкнено, а не видалено. */
  deactivated?: boolean
}

export interface SessionUser {
  email: string
}

export interface ProfileListResponse {
  items: Profile[]
}

export interface CounterpartyListResponse {
  items: CounterpartyWithContracts[]
}

export interface ContractListResponse {
  items: Contract[]
}

export interface DocumentListResponse {
  items: DocumentSummary[]
}
