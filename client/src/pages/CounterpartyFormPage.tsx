import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  buildCustomerPreamble,
  formatDateShort,
  formatQty,
  parseAmountToMinor,
  todayISO,
  type Contract,
  type Counterparty,
  type CounterpartyWithContracts,
  type OkResponse,
} from '@rekvizyt/shared'
import { api, errorMessage } from '../api'
import { Field } from '../components/Field'

interface CpFormState {
  type: 'tov' | 'fop'
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

interface ContractFormState {
  number: string
  date: string
  serviceType: string
  serviceLabel: string
  unit: string
  price: string
  qty: string
  isActive: boolean
}

const EMPTY_COUNTERPARTY: CpFormState = {
  type: 'tov',
  name: '',
  fullName: '',
  legalAddress: '',
  postalAddress: '',
  taxId: '',
  taxIdLabel: 'Код ЄДРПОУ',
  ipn: '',
  iban: '',
  bankName: '',
  mfo: '',
  phone: '',
  email: '',
  signerPosition: 'Директор',
  signerPositionGenitive: 'директора',
  signerName: '',
  signerNameGenitive: '',
  signerGender: 'm',
  basis: 'Статуту',
  registrationRecord: '',
  preamble: '',
  isActive: true,
}

function emptyContract(): ContractFormState {
  return {
    number: '',
    date: todayISO(),
    serviceType: '',
    serviceLabel: '',
    unit: 'посл.',
    price: '',
    qty: '',
    isActive: true,
  }
}

function toForm(item: Counterparty): CpFormState {
  return {
    type: item.type,
    name: item.name,
    fullName: item.fullName,
    legalAddress: item.legalAddress,
    postalAddress: item.postalAddress,
    taxId: item.taxId,
    taxIdLabel: item.taxIdLabel,
    ipn: item.ipn,
    iban: item.iban,
    bankName: item.bankName,
    mfo: item.mfo,
    phone: item.phone,
    email: item.email,
    signerPosition: item.signerPosition,
    signerPositionGenitive: item.signerPositionGenitive,
    signerName: item.signerName,
    signerNameGenitive: item.signerNameGenitive,
    signerGender: item.signerGender,
    basis: item.basis,
    registrationRecord: item.registrationRecord,
    preamble: item.preamble,
    isActive: item.isActive,
  }
}

export function CounterpartyFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<CpFormState>(EMPTY_COUNTERPARTY)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [contractOpen, setContractOpen] = useState(false)
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [contractForm, setContractForm] = useState<ContractFormState>(emptyContract)
  const [contractSaving, setContractSaving] = useState(false)
  const [contractError, setContractError] = useState<string | null>(null)

  const load = useCallback(
    async (counterpartyId: string) => {
      setLoading(true)
      setError(null)
      try {
        const item = await api.get<CounterpartyWithContracts>(
          `/api/counterparties/${counterpartyId}`,
        )
        setForm(toForm(item))
        setContracts(item.contracts)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (id) {
      void load(id)
      return
    }
    setForm(EMPTY_COUNTERPARTY)
    setContracts([])
    setLoading(false)
  }, [id, load])

  const autoPreamble = useMemo(
    () =>
      buildCustomerPreamble({
        type: form.type,
        fullName: form.fullName,
        signerPositionGenitive: form.signerPositionGenitive,
        signerNameGenitive: form.signerNameGenitive,
        signerGender: form.signerGender,
        basis: form.basis,
        registrationRecord: form.registrationRecord,
      }),
    [
      form.type,
      form.fullName,
      form.signerPositionGenitive,
      form.signerNameGenitive,
      form.signerGender,
      form.basis,
      form.registrationRecord,
    ],
  )

  const changeType = (type: 'tov' | 'fop') => {
    setForm((prev) => ({
      ...prev,
      type,
      taxId: '',
      taxIdLabel: type === 'tov' ? 'Код ЄДРПОУ' : 'Код РНОКПП',
      signerPosition: type === 'tov' ? 'Директор' : 'Фізична особа-підприємець',
      signerPositionGenitive: type === 'tov' ? 'директора' : 'фізичної особи-підприємця',
      basis: type === 'tov' ? 'Статуту' : '',
    }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (id) {
        await api.put<Counterparty>(`/api/counterparties/${id}`, form)
        await load(id)
        setNotice('Замовника збережено.')
      } else {
        const created = await api.post<Counterparty>('/api/counterparties', form)
        navigate(`/admin/counterparties/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openNewContract = () => {
    setContractForm(emptyContract())
    setEditingContractId(null)
    setContractError(null)
    setContractOpen(true)
  }

  const openEditContract = (contract: Contract) => {
    setContractForm({
      number: contract.number,
      date: contract.date,
      serviceType: contract.serviceType,
      serviceLabel: contract.serviceLabel,
      unit: contract.unit,
      price:
        contract.defaultPriceMinor === null
          ? ''
          : String(Math.trunc(contract.defaultPriceMinor / 100)) +
            (contract.defaultPriceMinor % 100 === 0
              ? ''
              : `,${String(contract.defaultPriceMinor % 100).padStart(2, '0')}`),
      qty: contract.defaultQty === null ? '' : formatQty(contract.defaultQty),
      isActive: contract.isActive,
    })
    setEditingContractId(contract.id)
    setContractError(null)
    setContractOpen(true)
  }

  const closeContract = () => {
    setContractOpen(false)
    setEditingContractId(null)
    setContractError(null)
  }

  const submitContract = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setContractError(null)

    let defaultPriceMinor: number | null = null
    if (contractForm.price.trim() !== '') {
      defaultPriceMinor = parseAmountToMinor(contractForm.price)
      if (defaultPriceMinor === null) {
        setContractError('Ціна має бути числом, наприклад 6900 або 6900,50')
        return
      }
    }

    let defaultQty: number | null = null
    if (contractForm.qty.trim() !== '') {
      const parsed = Number(contractForm.qty.replace(/\s+/g, '').replace(',', '.'))
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setContractError('Кількість має бути додатним числом')
        return
      }
      defaultQty = parsed
    }

    const payload = {
      number: contractForm.number,
      date: contractForm.date,
      serviceType: contractForm.serviceType,
      serviceLabel: contractForm.serviceLabel || contractForm.serviceType,
      unit: contractForm.unit,
      defaultPriceMinor,
      defaultQty,
      isActive: contractForm.isActive,
    }

    setContractSaving(true)
    try {
      if (editingContractId) {
        await api.put<Contract>(`/api/contracts/${editingContractId}`, payload)
      } else {
        await api.post<Contract>(`/api/counterparties/${id}/contracts`, payload)
      }
      await load(id)
      closeContract()
    } catch (err) {
      setContractError(errorMessage(err))
    } finally {
      setContractSaving(false)
    }
  }

  const removeContract = async (contract: Contract) => {
    if (!id) return
    if (!window.confirm(`Видалити договір № ${contract.number}?`)) return
    setContractError(null)
    try {
      const result = await api.del<OkResponse>(`/api/contracts/${contract.id}`)
      await load(id)
      if (result.deactivated) {
        setContractError('Договір використовується в документах - його вимкнено, а не видалено.')
      }
    } catch (err) {
      setContractError(errorMessage(err))
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">{id ? 'Редагувати замовника' : 'Новий замовник'}</h1>
          <p className="page-subtitle">
            Вступна фраза для акта формується автоматично з цих даних - її можна переписати вручну.
          </p>
        </div>
        <Link className="btn btn-ghost" to="/admin/counterparties">
          До списку
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-info">{notice}</div>}

      {loading ? (
        <p className="muted">Завантаження…</p>
      ) : (
        <form className="card" onSubmit={submit}>
          <h2 className="card-title">Реквізити замовника</h2>

          <div className="form-grid">
            <Field label="Тип">
              <select
                className="input"
                value={form.type}
                onChange={(event) => changeType(event.target.value === 'fop' ? 'fop' : 'tov')}
              >
                <option value="tov">ТОВ / юридична особа</option>
                <option value="fop">ФОП / фізична особа-підприємець</option>
              </select>
            </Field>
            <Field label="Коротка назва" hint="Використовується у списках документів">
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Повна назва (як у документах)" wide>
              <input
                className="input"
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
              />
            </Field>
            <Field label="Юридична адреса" wide>
              <input
                className="input"
                value={form.legalAddress}
                onChange={(event) => setForm({ ...form, legalAddress: event.target.value })}
                required
              />
            </Field>
            <Field label="Адреса для листування" wide>
              <input
                className="input"
                value={form.postalAddress}
                onChange={(event) => setForm({ ...form, postalAddress: event.target.value })}
              />
            </Field>
            <Field label="Назва податкового номера">
              <input
                className="input"
                value={form.taxIdLabel}
                onChange={(event) => setForm({ ...form, taxIdLabel: event.target.value })}
                required
              />
            </Field>
            <Field
              label="Податковий номер"
              hint={form.type === 'tov' ? 'ЄДРПОУ - 8 цифр' : 'РНОКПП - 10 цифр'}
            >
              <input
                className="input mono"
                value={form.taxId}
                onChange={(event) => setForm({ ...form, taxId: event.target.value })}
                required
                inputMode="numeric"
              />
            </Field>
            <Field label="ІПН (за наявності)">
              <input
                className="input mono"
                value={form.ipn}
                onChange={(event) => setForm({ ...form, ipn: event.target.value })}
                inputMode="numeric"
              />
            </Field>
            <Field label="IBAN">
              <input
                className="input mono"
                value={form.iban}
                onChange={(event) => setForm({ ...form, iban: event.target.value.toUpperCase() })}
                required
                placeholder="UA..."
              />
            </Field>
            <Field label="Банк">
              <input
                className="input"
                value={form.bankName}
                onChange={(event) => setForm({ ...form, bankName: event.target.value })}
                required
              />
            </Field>
            <Field label="МФО">
              <input
                className="input"
                value={form.mfo}
                onChange={(event) => setForm({ ...form, mfo: event.target.value })}
                inputMode="numeric"
                maxLength={6}
              />
            </Field>
            <Field label="Телефон">
              <input
                className="input"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
          </div>

          <h3 className="section-title">Підписант</h3>
          <div className="form-grid">
            <Field label="Посада">
              <input
                className="input"
                value={form.signerPosition}
                onChange={(event) => setForm({ ...form, signerPosition: event.target.value })}
                required
              />
            </Field>
            <Field label="Посада в родовому відмінку" hint="Наприклад: «директора»">
              <input
                className="input"
                value={form.signerPositionGenitive}
                onChange={(event) =>
                  setForm({ ...form, signerPositionGenitive: event.target.value })
                }
                required
              />
            </Field>
            <Field label="ПІБ підписанта">
              <input
                className="input"
                value={form.signerName}
                onChange={(event) => setForm({ ...form, signerName: event.target.value })}
                required
              />
            </Field>
            <Field label="ПІБ у родовому відмінку" hint="Наприклад: «Кміта Федора Андрійовича»">
              <input
                className="input"
                value={form.signerNameGenitive}
                onChange={(event) =>
                  setForm({ ...form, signerNameGenitive: event.target.value })
                }
              />
            </Field>
            <Field label="Стать підписанта" hint="Впливає на «який/яка діє»">
              <select
                className="input"
                value={form.signerGender}
                onChange={(event) =>
                  setForm({ ...form, signerGender: event.target.value === 'f' ? 'f' : 'm' })
                }
              >
                <option value="m">чоловіча</option>
                <option value="f">жіноча</option>
              </select>
            </Field>
            <Field label="Підстава діяльності">
              <input
                className="input"
                value={form.basis}
                onChange={(event) => setForm({ ...form, basis: event.target.value })}
                placeholder="Статуту"
              />
            </Field>
            <Field
              label="Запис у ЄДР (для ФОП)"
              hint="Номер запису про державну реєстрацію"
            >
              <input
                className="input"
                value={form.registrationRecord}
                onChange={(event) =>
                  setForm({ ...form, registrationRecord: event.target.value })
                }
              />
            </Field>
          </div>

          <h3 className="section-title">Вступна фраза акта</h3>
          <div className="field field-wide">
            <span className="field-label">Текст у вступі акта</span>
            <textarea
              className="input textarea"
              value={form.preamble}
              onChange={(event) => setForm({ ...form, preamble: event.target.value })}
              rows={4}
              placeholder={autoPreamble}
            />
            <span className="field-hint">
              Порожнє поле - використовується автоматичний текст. Поточний автоматичний варіант:
              <span className="preamble-preview">{autoPreamble}</span>
              {form.preamble.trim() === '' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setForm({ ...form, preamble: autoPreamble })}
                >
                  Вставити цей текст у поле
                </button>
              )}
            </span>
          </div>

          <div className="form-checks">
            <label className="check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
              Активний (доступний для нових документів)
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Збереження…' : id ? 'Зберегти зміни' : 'Створити замовника'}
            </button>
            <Link className="btn btn-ghost" to="/admin/counterparties">
              Скасувати
            </Link>
          </div>
        </form>
      )}

      {!loading && !id && (
        <div className="alert alert-info">
          Договори можна додати після створення замовника - вони прив’язані до нього.
        </div>
      )}

      {!loading && id && (
        <section className="card">
          <div className="card-row">
            <h2 className="card-title">Договори</h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={openNewContract}>
              Додати договір
            </button>
          </div>

          {contractError && <div className="alert alert-error">{contractError}</div>}

          {contractOpen && (
            <form className="inline-form" onSubmit={submitContract}>
              <div className="form-grid">
                <Field label="Номер договору">
                  <input
                    className="input"
                    value={contractForm.number}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, number: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Дата договору">
                  <input
                    className="input"
                    type="date"
                    value={contractForm.date}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, date: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Одиниця" hint="шт, посл., год, міс.">
                  <input
                    className="input"
                    value={contractForm.unit}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, unit: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Ціна за одиницю" hint="Можна залишити порожнім">
                  <input
                    className="input"
                    value={contractForm.price}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, price: event.target.value })
                    }
                    inputMode="decimal"
                    placeholder="6900,00"
                  />
                </Field>
                <Field label="Кількість за замовчуванням">
                  <input
                    className="input"
                    value={contractForm.qty}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, qty: event.target.value })
                    }
                    inputMode="decimal"
                    placeholder="1"
                  />
                </Field>
                <Field label="Назва послуги для списку">
                  <input
                    className="input"
                    value={contractForm.serviceLabel}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, serviceLabel: event.target.value })
                    }
                    placeholder="Сервісне обслуговування комп’ютерної мережі"
                  />
                </Field>
                <Field label="Опис послуги (в акті)" wide>
                  <textarea
                    className="input textarea"
                    value={contractForm.serviceType}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, serviceType: event.target.value })
                    }
                    rows={3}
                    required
                  />
                </Field>
              </div>

              <div className="form-checks">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={contractForm.isActive}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, isActive: event.target.checked })
                    }
                  />
                  Договір активний
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={contractSaving}>
                  {contractSaving ? 'Збереження…' : editingContractId ? 'Зберегти' : 'Додати'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeContract}>
                  Скасувати
                </button>
              </div>
            </form>
          )}

          {contracts.length === 0 ? (
            <p className="muted">Договорів ще немає.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Дата</th>
                    <th>Послуга</th>
                    <th className="text-right">Ціна</th>
                    <th aria-label="Дії" />
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id} className={contract.isActive ? '' : 'row-inactive'}>
                      <td className="nowrap">
                        {contract.number}
                        {!contract.isActive && <span className="badge">вимкнено</span>}
                      </td>
                      <td className="nowrap">{formatDateShort(contract.date)}</td>
                      <td className="muted">{contract.serviceLabel}</td>
                      <td className="text-right nowrap">
                        {contract.defaultPriceMinor === null
                          ? '-'
                          : `${(contract.defaultPriceMinor / 100).toLocaleString('uk-UA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} грн`}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditContract(contract)}
                          >
                            Змінити
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-danger-text"
                            onClick={() => void removeContract(contract)}
                          >
                            Видалити
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
