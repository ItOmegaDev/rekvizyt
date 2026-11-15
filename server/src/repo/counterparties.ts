import { randomUUID } from 'node:crypto'
import {
  buildCustomerPreamble,
  type Contract,
  type ContractInput,
  type Counterparty,
  type CounterpartyInput,
  type CounterpartyWithContracts,
  type CounterpartyType,
} from '@rekvizyt/shared'
import { getDb } from '../db.js'

interface CounterpartyRow {
  id: string
  type: CounterpartyType
  name: string
  full_name: string
  legal_address: string
  postal_address: string
  tax_id: string
  tax_id_label: string
  ipn: string
  iban: string
  bank_name: string
  mfo: string
  phone: string
  email: string
  signer_position: string
  signer_position_genitive: string
  signer_name: string
  signer_name_genitive: string
  signer_gender: 'm' | 'f'
  basis: string
  registration_record: string
  preamble: string
  is_active: number
}

interface ContractRow {
  id: string
  counterparty_id: string
  number: string
  date: string
  service_type: string
  service_label: string
  unit: string
  default_price_minor: number | null
  default_qty: number | null
  is_active: number
}

const CP_COLUMNS = `id, type, name, full_name, legal_address, postal_address, tax_id,
  tax_id_label, ipn, iban, bank_name, mfo, phone, email, signer_position,
  signer_position_genitive, signer_name, signer_name_genitive, signer_gender, basis,
  registration_record, preamble, is_active`

const CONTRACT_COLUMNS = `id, counterparty_id, number, date, service_type, service_label, unit,
  default_price_minor, default_qty, is_active`

function now(): string {
  return new Date().toISOString()
}

function mapCounterparty(row: CounterpartyRow): Counterparty {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    fullName: row.full_name,
    legalAddress: row.legal_address,
    postalAddress: row.postal_address,
    taxId: row.tax_id,
    taxIdLabel: row.tax_id_label,
    ipn: row.ipn,
    iban: row.iban,
    bankName: row.bank_name,
    mfo: row.mfo,
    phone: row.phone,
    email: row.email,
    signerPosition: row.signer_position,
    signerPositionGenitive: row.signer_position_genitive,
    signerName: row.signer_name,
    signerNameGenitive: row.signer_name_genitive,
    signerGender: row.signer_gender,
    basis: row.basis,
    registrationRecord: row.registration_record,
    preamble: row.preamble,
    isActive: row.is_active === 1,
  }
}

function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    counterpartyId: row.counterparty_id,
    number: row.number,
    date: row.date,
    serviceType: row.service_type,
    serviceLabel: row.service_label,
    unit: row.unit,
    defaultPriceMinor: row.default_price_minor,
    defaultQty: row.default_qty,
    isActive: row.is_active === 1,
  }
}

function listContractsByCounterparty(counterpartyId: string): Contract[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CONTRACT_COLUMNS} FROM contracts WHERE counterparty_id = ?
       ORDER BY is_active DESC, date DESC, number ASC`,
    )
    .all(counterpartyId) as unknown as ContractRow[]
  return rows.map(mapContract)
}

export function listCounterparties(includeInactive = false): CounterpartyWithContracts[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT ${CP_COLUMNS} FROM counterparties ${includeInactive ? '' : 'WHERE is_active = 1'}
       ORDER BY is_active DESC, name ASC`,
    )
    .all() as unknown as CounterpartyRow[]
  return rows.map((row) => ({
    ...mapCounterparty(row),
    contracts: listContractsByCounterparty(row.id),
  }))
}

export function getCounterparty(id: string): Counterparty | null {
  const row = getDb()
    .prepare(`SELECT ${CP_COLUMNS} FROM counterparties WHERE id = ?`)
    .get(id) as unknown as CounterpartyRow | undefined
  return row ? mapCounterparty(row) : null
}

export function getCounterpartyWithContracts(id: string): CounterpartyWithContracts | null {
  const counterparty = getCounterparty(id)
  if (!counterparty) return null
  return { ...counterparty, contracts: listContractsByCounterparty(id) }
}

function resolvePreamble(input: CounterpartyInput): string {
  const manual = input.preamble.trim()
  if (manual) return manual
  return buildCustomerPreamble(input)
}

export function createCounterparty(input: CounterpartyInput): Counterparty {
  const db = getDb()
  const id = randomUUID()
  const timestamp = now()
  const preamble = resolvePreamble(input)

  db.prepare(
    `INSERT INTO counterparties (id, type, name, full_name, legal_address, postal_address,
       tax_id, tax_id_label, ipn, iban, bank_name, mfo, phone, email, signer_position,
       signer_position_genitive, signer_name, signer_name_genitive, signer_gender, basis,
       registration_record, preamble, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.type,
    input.name,
    input.fullName,
    input.legalAddress,
    input.postalAddress,
    input.taxId,
    input.taxIdLabel,
    input.ipn,
    input.iban,
    input.bankName,
    input.mfo,
    input.phone,
    input.email,
    input.signerPosition,
    input.signerPositionGenitive,
    input.signerName,
    input.signerNameGenitive,
    input.signerGender,
    input.basis,
    input.registrationRecord,
    preamble,
    input.isActive ? 1 : 0,
    timestamp,
    timestamp,
  )

  return getCounterparty(id)!
}

export function updateCounterparty(id: string, input: CounterpartyInput): Counterparty | null {
  const db = getDb()
  if (!getCounterparty(id)) return null

  db.prepare(
    `UPDATE counterparties SET type = ?, name = ?, full_name = ?, legal_address = ?,
       postal_address = ?, tax_id = ?, tax_id_label = ?, ipn = ?, iban = ?, bank_name = ?,
       mfo = ?, phone = ?, email = ?, signer_position = ?, signer_position_genitive = ?,
       signer_name = ?, signer_name_genitive = ?, signer_gender = ?, basis = ?,
       registration_record = ?, preamble = ?, is_active = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.type,
    input.name,
    input.fullName,
    input.legalAddress,
    input.postalAddress,
    input.taxId,
    input.taxIdLabel,
    input.ipn,
    input.iban,
    input.bankName,
    input.mfo,
    input.phone,
    input.email,
    input.signerPosition,
    input.signerPositionGenitive,
    input.signerName,
    input.signerNameGenitive,
    input.signerGender,
    input.basis,
    input.registrationRecord,
    resolvePreamble(input),
    input.isActive ? 1 : 0,
    now(),
    id,
  )

  return getCounterparty(id)
}

/** Замовника з документами не видаляємо — вимикаємо разом із договорами. */
export function deleteCounterparty(id: string): 'deleted' | 'deactivated' | 'not_found' {
  const db = getDb()
  if (!getCounterparty(id)) return 'not_found'
  const timestamp = now()

  const used = db
    .prepare('SELECT COUNT(*) AS count FROM documents WHERE counterparty_id = ?')
    .get(id) as { count: number }

  if (used.count > 0) {
    db.prepare(
      'UPDATE counterparties SET is_active = 0, updated_at = ? WHERE id = ?',
    ).run(timestamp, id)
    db.prepare(
      'UPDATE contracts SET is_active = 0, updated_at = ? WHERE counterparty_id = ?',
    ).run(timestamp, id)
    return 'deactivated'
  }

  db.prepare('DELETE FROM counterparties WHERE id = ?').run(id)
  return 'deleted'
}

/* ─────────────────────────────── Договори ─────────────────────────────── */

export function listContracts(includeInactive = false): Contract[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CONTRACT_COLUMNS} FROM contracts ${includeInactive ? '' : 'WHERE is_active = 1'}
       ORDER BY is_active DESC, date DESC, number ASC`,
    )
    .all() as unknown as ContractRow[]
  return rows.map(mapContract)
}

export function getContract(id: string): Contract | null {
  const row = getDb()
    .prepare(`SELECT ${CONTRACT_COLUMNS} FROM contracts WHERE id = ?`)
    .get(id) as unknown as ContractRow | undefined
  return row ? mapContract(row) : null
}

export function createContract(counterpartyId: string, input: ContractInput): Contract | null {
  const db = getDb()
  if (!getCounterparty(counterpartyId)) return null

  const id = randomUUID()
  const timestamp = now()
  db.prepare(
    `INSERT INTO contracts (id, counterparty_id, number, date, service_type, service_label, unit,
       default_price_minor, default_qty, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    counterpartyId,
    input.number,
    input.date,
    input.serviceType,
    input.serviceLabel,
    input.unit,
    input.defaultPriceMinor,
    input.defaultQty,
    input.isActive ? 1 : 0,
    timestamp,
    timestamp,
  )

  return getContract(id)
}

export function updateContract(id: string, input: ContractInput): Contract | null {
  const db = getDb()
  if (!getContract(id)) return null

  db.prepare(
    `UPDATE contracts SET number = ?, date = ?, service_type = ?, service_label = ?, unit = ?,
       default_price_minor = ?, default_qty = ?, is_active = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.number,
    input.date,
    input.serviceType,
    input.serviceLabel,
    input.unit,
    input.defaultPriceMinor,
    input.defaultQty,
    input.isActive ? 1 : 0,
    now(),
    id,
  )

  return getContract(id)
}

export function deleteContract(id: string): 'deleted' | 'deactivated' | 'not_found' {
  const db = getDb()
  if (!getContract(id)) return 'not_found'

  const used = db
    .prepare('SELECT COUNT(*) AS count FROM documents WHERE contract_id = ?')
    .get(id) as { count: number }

  if (used.count > 0) {
    db.prepare('UPDATE contracts SET is_active = 0, updated_at = ? WHERE id = ?').run(now(), id)
    return 'deactivated'
  }

  db.prepare('DELETE FROM contracts WHERE id = ?').run(id)
  return 'deleted'
}
