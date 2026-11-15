import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// node:sqlite — вбудований модуль Node 22+. Завантажуємо через require, щоб
// збірка (tsup/esbuild) не перетворювала специфікатор «node:sqlite» на «sqlite».
const requireNodeSqlite = createRequire(import.meta.url)
const { DatabaseSync } = requireNodeSqlite('node:sqlite') as {
  DatabaseSync: new (path: string) => DatabaseSyncInstance
}

// Локальний тип-аліас, щоб не залежати від type-only імпорту в runtime.
interface DatabaseSyncInstance {
  exec(sql: string): void
  prepare(sql: string): {
    get(...args: unknown[]): unknown
    all(...args: unknown[]): unknown[]
    run(...args: unknown[]): { changes: number | bigint }
  }
  close(): void
}

let db: DatabaseSyncInstance | null = null

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS profiles (
  id                  TEXT PRIMARY KEY,
  label               TEXT NOT NULL,
  name                TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  address             TEXT NOT NULL,
  tax_id              TEXT NOT NULL,
  iban                TEXT NOT NULL,
  bank_name           TEXT NOT NULL,
  mfo                 TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  tax_note            TEXT NOT NULL DEFAULT '',
  signer_name         TEXT NOT NULL,
  signer_position     TEXT NOT NULL DEFAULT 'Фізична особа-підприємець',
  registration_record TEXT NOT NULL DEFAULT '',
  is_default          INTEGER NOT NULL DEFAULT 0,
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counterparties (
  id                       TEXT PRIMARY KEY,
  type                     TEXT NOT NULL CHECK (type IN ('tov', 'fop')),
  name                     TEXT NOT NULL,
  full_name                TEXT NOT NULL,
  legal_address            TEXT NOT NULL,
  postal_address           TEXT NOT NULL DEFAULT '',
  tax_id                   TEXT NOT NULL,
  tax_id_label             TEXT NOT NULL,
  ipn                      TEXT NOT NULL DEFAULT '',
  iban                     TEXT NOT NULL,
  bank_name                TEXT NOT NULL,
  mfo                      TEXT NOT NULL DEFAULT '',
  phone                    TEXT NOT NULL DEFAULT '',
  email                    TEXT NOT NULL DEFAULT '',
  signer_position          TEXT NOT NULL DEFAULT 'Директор',
  signer_position_genitive TEXT NOT NULL DEFAULT 'директора',
  signer_name              TEXT NOT NULL,
  signer_name_genitive     TEXT NOT NULL DEFAULT '',
  signer_gender            TEXT NOT NULL DEFAULT 'm' CHECK (signer_gender IN ('m', 'f')),
  basis                    TEXT NOT NULL DEFAULT '',
  registration_record      TEXT NOT NULL DEFAULT '',
  preamble                 TEXT NOT NULL DEFAULT '',
  is_active                INTEGER NOT NULL DEFAULT 1,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id                  TEXT PRIMARY KEY,
  counterparty_id     TEXT NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
  number              TEXT NOT NULL,
  date                TEXT NOT NULL,
  service_type        TEXT NOT NULL,
  service_label       TEXT NOT NULL,
  unit                TEXT NOT NULL DEFAULT 'шт',
  default_price_minor INTEGER,
  default_qty         REAL,
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contracts_counterparty ON contracts(counterparty_id);

CREATE TABLE IF NOT EXISTS documents (
  id                   TEXT PRIMARY KEY,
  number               TEXT NOT NULL,
  issued_at            TEXT NOT NULL,
  month_key            TEXT NOT NULL,
  seq                  INTEGER NOT NULL,
  profile_id           TEXT NOT NULL REFERENCES profiles(id),
  counterparty_id      TEXT NOT NULL REFERENCES counterparties(id),
  contract_id          TEXT NOT NULL REFERENCES contracts(id),
  profile_snapshot     TEXT NOT NULL,
  counterparty_snapshot TEXT NOT NULL,
  contract_snapshot    TEXT NOT NULL,
  items                TEXT NOT NULL,
  total_minor          INTEGER NOT NULL,
  vat_note             TEXT NOT NULL,
  note                 TEXT NOT NULL DEFAULT '',
  customer_preamble    TEXT NOT NULL DEFAULT '',
  executor_preamble    TEXT NOT NULL DEFAULT '',
  paid_at              TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_issued_at ON documents(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_month_key ON documents(month_key, seq);
`

/** Відкриває (і за потреби створює) файл бази. */
export function initDb(dataDir: string): DatabaseSyncInstance {
  mkdirSync(dataDir, { recursive: true })
  const database = new DatabaseSync(path.join(dataDir, 'rekvizyt.db'))
  database.exec(SCHEMA)
  // Міграція: додати колонку paid_at, якщо її ще немає (старі БД).
  try {
    database.exec('ALTER TABLE documents ADD COLUMN paid_at TEXT')
  } catch {
    // колонка вже існує — ігноруємо
  }
  db = database
  return database
}

export function getDb(): DatabaseSyncInstance {
  if (!db) throw new Error('База даних не ініціалізована')
  return db
}

export function dbState(): 'connected' | 'disconnected' {
  return db ? 'connected' : 'disconnected'
}

export function closeDb(): void {
  db?.close()
  db = null
}
