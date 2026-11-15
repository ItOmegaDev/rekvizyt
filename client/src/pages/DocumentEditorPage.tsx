import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  amountInWordsUAH,
  calcItemAmount,
  formatMoney,
  parseAmountToMinor,
  todayISO,
  VAT_NOTE_DEFAULT,
  type CounterpartyWithContracts,
  type DocumentDetail,
  type Profile,
} from '@rekvizyt/shared'
import { api, errorMessage } from '../api'
import { Field } from '../components/Field'

interface ItemState {
  key: string
  label: string
  qty: string
  unit: string
  price: string
}

function newItem(label = '', qty = '1', unit = 'посл.', price = ''): ItemState {
  return { key: crypto.randomUUID(), label, qty, unit, price }
}

function toPriceInput(minor: number): string {
  const hryvnia = Math.trunc(minor / 100)
  const kopecks = minor % 100
  return kopecks === 0 ? String(hryvnia) : `${hryvnia},${String(kopecks).padStart(2, '0')}`
}

function qtyValue(raw: string): number {
  const parsed = Number(raw.replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [counterparties, setCounterparties] = useState<CounterpartyWithContracts[]>([])

  const [profileId, setProfileId] = useState('')
  const [contractId, setContractId] = useState('')
  const [issuedAt, setIssuedAt] = useState(todayISO())
  const [number, setNumber] = useState('')
  const [numberTouched, setNumberTouched] = useState(false)
  const [items, setItems] = useState<ItemState[]>([newItem()])
  const [vatNote, setVatNote] = useState(VAT_NOTE_DEFAULT)
  const [note, setNote] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const suffix = isEdit ? '?all=1' : ''
      const [profileData, counterpartyData] = await Promise.all([
        api.get<{ items: Profile[] }>(`/api/profiles${suffix}`),
        api.get<{ items: CounterpartyWithContracts[] }>(`/api/counterparties${suffix}`),
      ])
      setProfiles(profileData.items)
      setCounterparties(counterpartyData.items)

      if (isEdit && id) {
        const doc = await api.get<DocumentDetail>(`/api/documents/${id}`)
        setProfileId(doc.profileId)
        setContractId(doc.contractId)
        setIssuedAt(doc.issuedAt)
        setNumber(doc.number)
        setNumberTouched(true)
        setItems(
          doc.items.map((item) => ({
            key: crypto.randomUUID(),
            label: item.label,
            qty: String(item.qty).replace('.', ','),
            unit: item.unit,
            price: toPriceInput(item.unitPriceMinor),
          })),
        )
        setVatNote(doc.vatNote)
        setNote(doc.note)
      } else {
        const preferred = profileData.items.find((profile) => profile.isDefault) ?? profileData.items[0]
        setProfileId(preferred?.id ?? '')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id, isEdit])

  useEffect(() => {
    void load()
  }, [load])

  /** Новий номер «NN-MM» підтягується з сервера, доки його не змінили вручну. */
  useEffect(() => {
    if (isEdit || numberTouched || !issuedAt) return
    let cancelled = false
    api
      .get<{ number: string }>(`/api/documents/next-number?date=${issuedAt}`)
      .then((data) => {
        if (!cancelled) setNumber(data.number)
      })
      .catch(() => {
        /* номер можна ввести вручну */
      })
    return () => {
      cancelled = true
    }
  }, [issuedAt, isEdit, numberTouched])

  const selectedContract = useMemo(() => {
    for (const counterparty of counterparties) {
      const found = counterparty.contracts.find((contract) => contract.id === contractId)
      if (found) return found
    }
    return null
  }, [counterparties, contractId])

  const applyContract = (value: string) => {
    setContractId(value)
    if (!value) return
    let contract = null
    for (const counterparty of counterparties) {
      const found = counterparty.contracts.find((item) => item.id === value)
      if (found) contract = found
    }
    if (!contract) return

    setItems([
      newItem(
        contract.serviceLabel,
        contract.defaultQty === null ? '1' : String(contract.defaultQty).replace('.', ','),
        contract.unit,
        contract.defaultPriceMinor === null ? '' : toPriceInput(contract.defaultPriceMinor),
      ),
    ])
  }

  const totalMinor = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = parseAmountToMinor(item.price) ?? 0
        return sum + calcItemAmount(qtyValue(item.qty), price)
      }, 0),
    [items],
  )

  const words = useMemo(() => amountInWordsUAH(totalMinor), [totalMinor])

  const updateItem = (key: string, patch: Partial<ItemState>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!profileId) {
      setError('Виберіть свої реквізити.')
      return
    }
    if (!contractId) {
      setError('Виберіть договір.')
      return
    }

    const payloadItems = []
    for (const [index, item] of items.entries()) {
      const qty = qtyValue(item.qty)
      if (!item.label.trim()) {
        setError(`Позиція ${index + 1}: заповніть назву.`)
        return
      }
      if (qty <= 0) {
        setError(`Позиція ${index + 1}: кількість має бути більшою за нуль.`)
        return
      }
      const unitPriceMinor = item.price.trim() === '' ? 0 : parseAmountToMinor(item.price)
      if (unitPriceMinor === null) {
        setError(`Позиція ${index + 1}: ціна має бути числом.`)
        return
      }
      payloadItems.push({
        label: item.label.trim(),
        qty,
        unit: item.unit.trim() || 'шт',
        unitPriceMinor,
      })
    }

    if (payloadItems.length === 0) {
      setError('Додайте хоча б одну позицію.')
      return
    }

    const payload = {
      profileId,
      contractId,
      issuedAt,
      number,
      items: payloadItems,
      vatNote,
      note,
    }

    setSaving(true)
    try {
      const saved = isEdit && id
        ? await api.put<DocumentDetail>(`/api/documents/${id}`, payload)
        : await api.post<DocumentDetail>('/api/documents', payload)
      navigate(`/admin/documents/${saved.id}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page-center muted">Завантаження…</div>

  return (
    <form className="stack" onSubmit={submit}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{isEdit ? 'Редагувати документ' : 'Новий документ'}</h1>
          <p className="page-subtitle">
            Один номер і одна дата для рахунку та акта. Сума рахується автоматично.
          </p>
        </div>
        <Link className="btn btn-ghost" to={isEdit && id ? `/admin/documents/${id}` : '/admin'}>
          Скасувати
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        <h2 className="card-title">Основне</h2>
        <div className="form-grid">
          <Field label="Мої реквізити">
            <select
              className="input"
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              required
            >
              <option value="">- виберіть -</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id} disabled={!profile.isActive && isEdit === false}>
                  {profile.label}
                  {profile.isActive ? '' : ' (вимкнено)'}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Договір" hint="Замовник і послуга підставляються з договору">
            <select
              className="input"
              value={contractId}
              onChange={(event) => applyContract(event.target.value)}
              required
            >
              <option value="">- виберіть -</option>
              {counterparties.map((counterparty) => {
                const visible = counterparty.contracts.filter(
                  (contract) => contract.isActive || contract.id === contractId,
                )
                if (visible.length === 0) return null
                return (
                  <optgroup key={counterparty.id} label={counterparty.name}>
                    {visible.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        № {contract.number} від {contract.date} - {contract.serviceLabel}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </Field>

          <Field label="Дата документа">
            <input
              className="input"
              type="date"
              value={issuedAt}
              onChange={(event) => setIssuedAt(event.target.value)}
              required
            />
          </Field>

          <Field label="Номер документа" hint="Формат NN-MM; змініть за потреби">
            <input
              className="input"
              value={number}
              onChange={(event) => {
                setNumber(event.target.value)
                setNumberTouched(true)
              }}
              required
            />
          </Field>
        </div>

        {selectedContract && (
          <p className="hint">
            Договір: № {selectedContract.number} від {selectedContract.date}. Опис для акта береться
            з договору.
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-row">
          <h2 className="card-title">Позиції</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setItems([...items, newItem('', '1', selectedContract?.unit ?? 'шт', '')])}
          >
            Додати позицію
          </button>
        </div>

        <div className="table-wrap">
          <table className="items-table">
            <thead>
              <tr>
                <th className="col-index">№</th>
                <th>Назва послуги</th>
                <th className="col-qty">К-сть</th>
                <th className="col-unit">Од.</th>
                <th className="col-price">Ціна, грн</th>
                <th className="col-sum text-right">Сума, грн</th>
                <th aria-label="Дії" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const price = parseAmountToMinor(item.price) ?? 0
                const amount = calcItemAmount(qtyValue(item.qty), price)
                return (
                  <tr key={item.key}>
                    <td className="cell-center muted">{index + 1}</td>
                    <td>
                      <input
                        className="input input-sm"
                        value={item.label}
                        onChange={(event) => updateItem(item.key, { label: event.target.value })}
                        placeholder="Назва послуги"
                        required
                      />
                    </td>
                    <td>
                      <input
                        className="input input-sm"
                        value={item.qty}
                        onChange={(event) => updateItem(item.key, { qty: event.target.value })}
                        inputMode="decimal"
                        required
                      />
                    </td>
                    <td>
                      <input
                        className="input input-sm"
                        value={item.unit}
                        onChange={(event) => updateItem(item.key, { unit: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="input input-sm"
                        value={item.price}
                        onChange={(event) => updateItem(item.key, { price: event.target.value })}
                        inputMode="decimal"
                        placeholder="0,00"
                      />
                    </td>
                    <td className="cell-right nowrap">{formatMoney(amount)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-danger-text"
                        onClick={() => setItems(items.filter((row) => row.key !== item.key))}
                        disabled={items.length === 1}
                        title="Видалити позицію"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="total-block">
          <div className="total-row">
            <span>Разом:</span>
            <strong>{formatMoney(totalMinor)} грн</strong>
          </div>
          <p className="total-words">{words.full}</p>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Примітки</h2>
        <div className="form-grid">
          <Field label="Примітка про ПДВ" wide>
            <input
              className="input"
              value={vatNote}
              onChange={(event) => setVatNote(event.target.value)}
            />
          </Field>
          <Field label="Внутрішня примітка (у документи не потрапляє)" wide>
            <input
              className="input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="form-actions sticky-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Створити рахунок і акт'}
        </button>
        <Link className="btn btn-ghost" to={isEdit && id ? `/admin/documents/${id}` : '/admin'}>
          Скасувати
        </Link>
      </div>
    </form>
  )
}
