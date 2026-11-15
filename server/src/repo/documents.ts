import { randomUUID } from 'node:crypto'
import {
  calcTotal,
  monthKey,
  monthNumber,
  suggestedNumber,
  toContractSnapshot,
  toCounterpartySnapshot,
  toProfileSnapshot,
  todayISO,
  type Contract,
  type ContractSnapshot,
  type Counterparty,
  type CounterpartySnapshot,
  type DocumentDetail,
  type DocumentItem,
  type DocumentSummary,
  type Profile,
  type ProfileSnapshot,
} from '@rekvizyt/shared'
import { getDb } from '../db.js'

interface DocumentRow {
  id: string
  number: string
  issued_at: string
  month_key: string
  seq: number
  profile_id: string
  counterparty_id: string
  contract_id: string
  profile_snapshot: string
  counterparty_snapshot: string
  contract_snapshot: string
  items: string
  total_minor: number
  vat_note: string
  note: string
  customer_preamble: string
  executor_preamble: string
  paid_at: string | null
  created_at: string
  updated_at: string
}

interface SummaryRow {
  id: string
  number: string
  issued_at: string
  total_minor: number
  counterparty_snapshot: string
  contract_snapshot: string
  paid_at: string | null
  created_at: string
}

function now(): string {
  return new Date().toISOString()
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function mapSummary(row: SummaryRow): DocumentSummary {
  const counterparty = parseJson<Partial<CounterpartySnapshot>>(row.counterparty_snapshot, {})
  const contract = parseJson<Partial<ContractSnapshot>>(row.contract_snapshot, {})
  return {
    id: row.id,
    number: row.number,
    issuedAt: row.issued_at,
    totalMinor: row.total_minor,
    counterpartyName: counterparty.name ?? '-',
    counterpartyFullName: counterparty.fullName ?? '',
    contractNumber: contract.number ?? '',
    serviceType: contract.serviceType ?? '',
    createdAt: row.created_at,
    paidAt: row.paid_at ?? null,
  }
}

function mapDetail(row: DocumentRow): DocumentDetail {
  return {
    id: row.id,
    number: row.number,
    issuedAt: row.issued_at,
    items: parseJson<DocumentItem[]>(row.items, []),
    totalMinor: row.total_minor,
    vatNote: row.vat_note,
    note: row.note,
    profileId: row.profile_id,
    counterpartyId: row.counterparty_id,
    contractId: row.contract_id,
    customerPreamble: row.customer_preamble,
    executorPreamble: row.executor_preamble,
    profile: parseJson<ProfileSnapshot>(row.profile_snapshot, {} as ProfileSnapshot),
    counterparty: parseJson<CounterpartySnapshot>(
      row.counterparty_snapshot,
      {} as CounterpartySnapshot,
    ),
    contract: parseJson<ContractSnapshot>(row.contract_snapshot, {} as ContractSnapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? null,
  }
}

export function listDocuments(query = '', limit = 100): DocumentSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT id, number, issued_at, total_minor, counterparty_snapshot, contract_snapshot, paid_at, created_at
       FROM documents ORDER BY issued_at DESC, created_at DESC LIMIT 500`,
    )
    .all() as unknown as SummaryRow[]

  const items = rows.map(mapSummary)
  const needle = query.trim().toLocaleLowerCase('uk')
  if (!needle) return items.slice(0, limit)

  return items
    .filter((item) =>
      [item.number, item.counterpartyName, item.counterpartyFullName, item.contractNumber, item.serviceType]
        .join(' ')
        .toLocaleLowerCase('uk')
        .includes(needle),
    )
    .slice(0, limit)
}

export function getDocument(id: string): DocumentDetail | null {
  const row = getDb()
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(id) as unknown as DocumentRow | undefined
  return row ? mapDetail(row) : null
}

/** Наступний номер «NN-MM» у межах місяця документа. */
export function nextDocumentNumber(issuedAt: string): { number: string; seq: number } {
  const key = monthKey(issuedAt)
  const row = getDb()
    .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM documents WHERE month_key = ?')
    .get(key) as { max_seq: number }
  const seq = Number(row.max_seq) + 1
  return { number: suggestedNumber(seq, monthNumber(issuedAt)), seq }
}

export interface DocumentWriteInput {
  profile: Profile
  counterparty: Counterparty
  contract: Contract
  issuedAt: string
  number: string
  items: DocumentItem[]
  vatNote: string
  note: string
  customerPreamble: string
  executorPreamble: string
}

function insert(
  id: string,
  input: DocumentWriteInput,
  seq: number,
  createdAt: string,
): void {
  const totalMinor = calcTotal(input.items)
  getDb()
    .prepare(
      `INSERT INTO documents (id, number, issued_at, month_key, seq, profile_id, counterparty_id,
         contract_id, profile_snapshot, counterparty_snapshot, contract_snapshot, items,
         total_minor, vat_note, note, customer_preamble, executor_preamble, paid_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.number,
      input.issuedAt,
      monthKey(input.issuedAt),
      seq,
      input.profile.id,
      input.counterparty.id,
      input.contract.id,
      JSON.stringify(toProfileSnapshot(input.profile)),
      JSON.stringify(toCounterpartySnapshot(input.counterparty)),
      JSON.stringify(toContractSnapshot(input.contract)),
      JSON.stringify(input.items),
      totalMinor,
      input.vatNote,
      input.note,
      input.customerPreamble,
      input.executorPreamble,
      null,
      createdAt,
      createdAt,
    )
}

export function createDocument(input: DocumentWriteInput, seq: number): DocumentDetail {
  const id = randomUUID()
  const timestamp = now()
  insert(id, input, seq, timestamp)
  return getDocument(id)!
}

export function updateDocument(id: string, input: DocumentWriteInput): DocumentDetail | null {
  if (!getDocument(id)) return null
  const totalMinor = calcTotal(input.items)

  getDb()
    .prepare(
      `UPDATE documents SET number = ?, issued_at = ?, month_key = ?, profile_id = ?,
         counterparty_id = ?, contract_id = ?, profile_snapshot = ?, counterparty_snapshot = ?,
         contract_snapshot = ?, items = ?, total_minor = ?, vat_note = ?, note = ?,
         customer_preamble = ?, executor_preamble = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.number,
      input.issuedAt,
      monthKey(input.issuedAt),
      input.profile.id,
      input.counterparty.id,
      input.contract.id,
      JSON.stringify(toProfileSnapshot(input.profile)),
      JSON.stringify(toCounterpartySnapshot(input.counterparty)),
      JSON.stringify(toContractSnapshot(input.contract)),
      JSON.stringify(input.items),
      totalMinor,
      input.vatNote,
      input.note,
      input.customerPreamble,
      input.executorPreamble,
      now(),
      id,
    )

  return getDocument(id)
}

export function deleteDocument(id: string): boolean {
  const result = getDb().prepare('DELETE FROM documents WHERE id = ?').run(id)
  return Number(result.changes) > 0
}

/** Позначити документ сплаченим (paidAt = ISO-дата) або зняти позначку (null). */
export function setDocumentPaid(id: string, paidAt: string | null): DocumentDetail | null {
  const result = getDb()
    .prepare('UPDATE documents SET paid_at = ?, updated_at = ? WHERE id = ?')
    .run(paidAt, now(), id)
  if (Number(result.changes) === 0) return null
  return getDocument(id)
}

/** Повторення документа: ті самі дані, сьогоднішня дата й новий номер. */
export function duplicateDocument(id: string): DocumentDetail | null {
  const row = getDb()
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(id) as unknown as DocumentRow | undefined
  if (!row) return null

  const issuedAt = todayISO()
  const { number, seq } = nextDocumentNumber(issuedAt)
  const newId = randomUUID()
  const timestamp = now()

  getDb()
    .prepare(
      `INSERT INTO documents (id, number, issued_at, month_key, seq, profile_id, counterparty_id,
         contract_id, profile_snapshot, counterparty_snapshot, contract_snapshot, items,
         total_minor, vat_note, note, customer_preamble, executor_preamble, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, profile_id, counterparty_id, contract_id, profile_snapshot,
         counterparty_snapshot, contract_snapshot, items, total_minor, vat_note, note,
         customer_preamble, executor_preamble, ?, ?
       FROM documents WHERE id = ?`,
    )
    .run(newId, number, issuedAt, monthKey(issuedAt), seq, timestamp, timestamp, id)

  return getDocument(newId)
}
