import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test, { after, before } from 'node:test'
import type {
  CounterpartyListResponse,
  Contract,
  DocumentDetail,
  DocumentListResponse,
  DocumentSummary,
  HealthResponse,
  OkResponse,
  Profile,
  ProfileListResponse,
} from '@rekvizyt/shared'

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'rekvizyt-api-'))

process.env.NODE_ENV = 'test'
process.env.DATA_DIR = tmpDir
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-1234'
process.env.DEV_LOGIN = '1'
process.env.SERVE_CLIENT = '0'
process.env.ALLOWED_EMAILS = ''
process.env.PORT = '4001'

let server: Server
let base = ''
let cookie = ''

interface Reply<T> {
  status: number
  data: T
}

async function call<T>(pathname: string, init: RequestInit = {}): Promise<Reply<T>> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  if (cookie) headers.set('cookie', cookie)

  const res = await fetch(`${base}${pathname}`, { ...init, headers })
  const data = (await res.json().catch(() => null)) as T
  return { status: res.status, data }
}

before(async () => {
  const { createApp } = await import('../app.js')
  const { initDb } = await import('../db.js')
  const { seedInitialData } = await import('../seed.js')

  initDb(tmpDir)
  seedInitialData()

  server = createApp().listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Не вдалося визначити порт')
  base = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  try {
    const { closeDb } = await import('../db.js')
    closeDb()
  } catch {
    /* ignore */
  }
  rmSync(tmpDir, { recursive: true, force: true })
})

test('API: здоров’я, авторизація, документи', async (t) => {
  let profileId = ''
  let contractId = ''
  let documentId = ''
  let duplicateId = ''

  await t.test('health відповідає ok', async () => {
    const { status, data } = await call<HealthResponse>('/api/health')
    assert.equal(status, 200)
    assert.equal(data.status, 'ok')
    assert.equal(data.db, 'connected')
  })

  await t.test('без сесії дані недоступні', async () => {
    const { status } = await call('/api/profiles')
    assert.equal(status, 401)
    const doc = await call('/api/documents')
    assert.equal(doc.status, 401)
  })

  await t.test('dev-вхід видає httpOnly cookie', async () => {
    const res = await fetch(`${base}/api/auth/dev-login`, { method: 'POST' })
    assert.equal(res.status, 200)
    const cookies = res.headers.getSetCookie()
    assert.ok(cookies.length > 0, 'очікували Set-Cookie')
    const raw = cookies[0]!
    assert.match(raw, /HttpOnly/i)
    assert.match(raw, /SameSite=Strict/i)
    cookie = raw.split(';')[0]!
  })

  await t.test('після входу видно два банки', async () => {
    const { status, data } = await call<ProfileListResponse>('/api/profiles')
    assert.equal(status, 200)
    assert.equal(data.items.length, 2)
    const defaults = data.items.filter((item: Profile) => item.isDefault)
    assert.equal(defaults.length, 1)
    profileId = data.items[0]!.id
    assert.match(data.items[0]!.iban, /^UA\d{27}$/)
  })

  await t.test('чотири замовники та п’ять договорів', async () => {
    const { status, data } = await call<CounterpartyListResponse>('/api/counterparties')
    assert.equal(status, 200)
    assert.equal(data.items.length, 4)
    const contracts = data.items.flatMap((item) => item.contracts)
    assert.equal(contracts.length, 5)
    const capitals = data.items.find((item) => item.name.includes('КЕПІТАЛС'))
    assert.ok(capitals)
    contractId = capitals.contracts[0]!.id
    assert.ok(contractId)
  })

  await t.test('наступний номер у листопаді — 1-11', async () => {
    const { status, data } = await call<{ number: string }>(
      '/api/documents/next-number?date=2026-11-15',
    )
    assert.equal(status, 200)
    assert.equal(data.number, '1-11')
  })

  await t.test('створення документа: номер, сума, вступні фрази', async () => {
    const { status, data } = await call<DocumentDetail>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({
        profileId,
        contractId,
        issuedAt: '2026-11-15',
        number: '',
        items: [
          { label: 'Надання поліграфічних послуг', qty: 2, unit: 'шт', unitPriceMinor: 345_000 },
        ],
        vatNote: 'Без ПДВ (ПДВ не передбачений).',
        note: 'тест',
      }),
    })

    assert.equal(status, 201)
    assert.equal(data.number, '1-11')
    assert.equal(data.totalMinor, 690_000)
    assert.equal(data.items[0]!.amountMinor, 690_000)
    assert.match(data.customerPreamble, /Замовник/)
    assert.match(data.executorPreamble, /Виконавець/)
    assert.equal(data.counterparty.taxIdLabel, 'Код ЄДРПОУ')
    documentId = data.id
  })

  await t.test('документ з’являється у списку', async () => {
    const { status, data } = await call<DocumentListResponse>('/api/documents')
    assert.equal(status, 200)
    assert.equal(data.items.length, 1)
    const summary = data.items[0] as DocumentSummary
    assert.equal(summary.number, '1-11')
    assert.equal(summary.totalMinor, 690_000)
    assert.match(summary.counterpartyName, /КЕПІТАЛС/)
  })

  await t.test('номер наступного документа зростає', async () => {
    const { data } = await call<{ number: string }>('/api/documents/next-number?date=2026-11-20')
    assert.equal(data.number, '2-11')
  })

  await t.test('редагування зберігає номер і перераховує суму', async () => {
    const { status, data } = await call<DocumentDetail>(`/api/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        profileId,
        contractId,
        issuedAt: '2026-11-15',
        number: '',
        items: [
          { label: 'Надання поліграфічних послуг', qty: 1, unit: 'шт', unitPriceMinor: 100_000 },
          { label: 'Доставка', qty: 2, unit: 'шт', unitPriceMinor: 5_000 },
        ],
        vatNote: 'Без ПДВ (ПДВ не передбачений).',
        note: '',
      }),
    })

    assert.equal(status, 200)
    assert.equal(data.number, '1-11')
    assert.equal(data.items.length, 2)
    assert.equal(data.totalMinor, 110_000)
  })

  await t.test('повторення створює новий документ', async () => {
    const { status, data } = await call<DocumentDetail>(
      `/api/documents/${documentId}/duplicate`,
      { method: 'POST' },
    )
    assert.equal(status, 201)
    assert.notEqual(data.id, documentId)
    assert.match(data.number, /^\d+-\d{2}$/)
    duplicateId = data.id
  })

  await t.test('видалення копії', async () => {
    const { status, data } = await call<OkResponse>(`/api/documents/${duplicateId}`, {
      method: 'DELETE',
    })
    assert.equal(status, 200)
    assert.equal(data.ok, true)
  })

  await t.test('некоректний ідентифікатор — 400', async () => {
    const { status } = await call('/api/documents/not-a-uuid')
    assert.equal(status, 400)
  })

  await t.test('IBAN без валідної суми відхиляється', async () => {
    const { status, data } = await call<{ error: string }>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({
        label: 'Тест',
        name: 'ФОП Тест',
        fullName: 'Фізична особа-підприємець Тест',
        address: 'м. Київ',
        taxId: '2963109131',
        iban: 'UA103052990000026005005909871',
        bankName: 'Банк',
        mfo: '',
        phone: '',
        taxNote: '',
        signerName: 'Тест',
        signerPosition: 'Фізична особа-підприємець',
        registrationRecord: '',
      }),
    })
    assert.equal(status, 400)
    assert.match(data.error, /IBAN/i)
  })

  await t.test('ЄДРПОУ для ТОВ — рівно 8 цифр', async () => {
    const { status } = await call('/api/counterparties', {
      method: 'POST',
      body: JSON.stringify({
        type: 'tov',
        name: 'ТОВ Тест',
        fullName: 'ТОВ «Тест»',
        legalAddress: 'м. Київ',
        taxId: '2963109131',
        taxIdLabel: 'Код ЄДРПОУ',
        iban: 'UA103052990000026005005909870',
        bankName: 'Банк',
        signerName: 'Тест',
      }),
    })
    assert.equal(status, 400)
  })

  await t.test('чужий Origin блокується (CSRF)', async () => {
    const { status } = await call('/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    })
    assert.equal(status, 403)
  })

  await t.test('договір із документом деактивується, а не видаляється', async () => {
    const { status, data } = await call<OkResponse>(`/api/contracts/${contractId}`, {
      method: 'DELETE',
    })
    assert.equal(status, 200)
    assert.equal(data.ok, true)
    assert.equal(data.deactivated, true)

    const list = await call<CounterpartyListResponse>('/api/counterparties?all=1')
    const contracts = list.data.items.flatMap((item) => item.contracts)
    const contract = contracts.find((item) => item.id === contractId)
    assert.ok(contract, 'договір має лишитися в базі')
    assert.equal(contract.isActive, false)
  })
})
