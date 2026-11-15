import { randomUUID } from 'node:crypto'
import type { Profile, ProfileInput } from '@rekvizyt/shared'
import { getDb } from '../db.js'

interface ProfileRow {
  id: string
  label: string
  name: string
  full_name: string
  address: string
  tax_id: string
  iban: string
  bank_name: string
  mfo: string
  phone: string
  tax_note: string
  signer_name: string
  signer_position: string
  registration_record: string
  is_default: number
  is_active: number
}

const COLUMNS = `id, label, name, full_name, address, tax_id, iban, bank_name, mfo, phone,
  tax_note, signer_name, signer_position, registration_record, is_default, is_active`

function map(row: ProfileRow): Profile {
  return {
    id: row.id,
    label: row.label,
    name: row.name,
    fullName: row.full_name,
    address: row.address,
    taxId: row.tax_id,
    iban: row.iban,
    bankName: row.bank_name,
    mfo: row.mfo,
    phone: row.phone,
    taxNote: row.tax_note,
    signerName: row.signer_name,
    signerPosition: row.signer_position,
    registrationRecord: row.registration_record,
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
  }
}

function now(): string {
  return new Date().toISOString()
}

/** Рівно один типовий банк серед активних. */
function ensureDefault(): void {
  const db = getDb()
  const existing = db
    .prepare('SELECT id FROM profiles WHERE is_default = 1 AND is_active = 1 LIMIT 1')
    .get()
  if (existing) return
  const first = db
    .prepare('SELECT id FROM profiles WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1')
    .get() as { id: string } | undefined
  if (!first) return
  db.prepare('UPDATE profiles SET is_default = 1, updated_at = ? WHERE id = ?').run(now(), first.id)
}

export function listProfiles(includeInactive = false): Profile[] {
  const rows = getDb()
    .prepare(
      `SELECT ${COLUMNS} FROM profiles ${includeInactive ? '' : 'WHERE is_active = 1'}
       ORDER BY is_default DESC, label ASC`,
    )
    .all() as unknown as ProfileRow[]
  return rows.map(map)
}

export function getProfile(id: string): Profile | null {
  const row = getDb()
    .prepare(`SELECT ${COLUMNS} FROM profiles WHERE id = ?`)
    .get(id) as unknown as ProfileRow | undefined
  return row ? map(row) : null
}

export function createProfile(input: ProfileInput): Profile {
  const db = getDb()
  const id = randomUUID()
  const timestamp = now()
  const first = db.prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number }
  const isDefault = input.isDefault || first.count === 0

  if (isDefault) {
    db.prepare('UPDATE profiles SET is_default = 0').run()
  }

  db.prepare(
    `INSERT INTO profiles (id, label, name, full_name, address, tax_id, iban, bank_name, mfo,
       phone, tax_note, signer_name, signer_position, registration_record, is_default, is_active,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.label,
    input.name,
    input.fullName,
    input.address,
    input.taxId,
    input.iban,
    input.bankName,
    input.mfo,
    input.phone,
    input.taxNote,
    input.signerName,
    input.signerPosition,
    input.registrationRecord,
    isDefault ? 1 : 0,
    input.isActive ? 1 : 0,
    timestamp,
    timestamp,
  )

  return getProfile(id)!
}

export function updateProfile(id: string, input: ProfileInput): Profile | null {
  const db = getDb()
  if (!getProfile(id)) return null

  const isDefault = input.isDefault && input.isActive
  if (isDefault) {
    db.prepare('UPDATE profiles SET is_default = 0 WHERE id != ?').run(id)
  }

  db.prepare(
    `UPDATE profiles SET label = ?, name = ?, full_name = ?, address = ?, tax_id = ?,
       iban = ?, bank_name = ?, mfo = ?, phone = ?, tax_note = ?, signer_name = ?,
       signer_position = ?, registration_record = ?, is_default = ?, is_active = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.label,
    input.name,
    input.fullName,
    input.address,
    input.taxId,
    input.iban,
    input.bankName,
    input.mfo,
    input.phone,
    input.taxNote,
    input.signerName,
    input.signerPosition,
    input.registrationRecord,
    isDefault ? 1 : 0,
    input.isActive ? 1 : 0,
    now(),
    id,
  )

  ensureDefault()
  return getProfile(id)
}

/** Використані в документах реквізити не видаляємо - деактивуємо. */
export function deleteProfile(id: string): 'deleted' | 'deactivated' | 'not_found' {
  const db = getDb()
  if (!getProfile(id)) return 'not_found'

  const used = db
    .prepare('SELECT COUNT(*) AS count FROM documents WHERE profile_id = ?')
    .get(id) as { count: number }
  const timestamp = now()

  if (used.count > 0) {
    db.prepare(
      'UPDATE profiles SET is_active = 0, is_default = 0, updated_at = ? WHERE id = ?',
    ).run(timestamp, id)
    ensureDefault()
    return 'deactivated'
  }

  db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
  ensureDefault()
  return 'deleted'
}
