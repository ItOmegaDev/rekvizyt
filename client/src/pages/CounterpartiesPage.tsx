import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatDateShort,
  type CounterpartyWithContracts,
  type OkResponse,
} from '@rekvizyt/shared'
import { api, errorMessage } from '../api'

export function CounterpartiesPage() {
  const [items, setItems] = useState<CounterpartyWithContracts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ items: CounterpartyWithContracts[] }>('/api/counterparties')
      setItems(data.items)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (item: CounterpartyWithContracts) => {
    if (
      !window.confirm(
        `Видалити замовника «${item.name}» разом із його договорами?\nЯкщо в нього вже є документи, запис буде вимкнено, а не видалено.`,
      )
    ) {
      return
    }
    setBusyId(item.id)
    setError(null)
    setNotice(null)
    try {
      const result = await api.del<OkResponse>(`/api/counterparties/${item.id}`)
      await load()
      setNotice(
        result.deactivated
          ? 'Замовник використовується в документах — його та договори вимкнено.'
          : 'Замовника видалено.',
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Замовники</h1>
          <p className="page-subtitle">
            Реквізити замовників і договори. Договір визначає послугу, яка підставляється в акт.
          </p>
        </div>
        <Link className="btn btn-primary" to="/admin/counterparties/new">
          Додати замовника
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-info">{notice}</div>}

      {loading ? (
        <p className="muted">Завантаження…</p>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-title">Ще немає жодного замовника</p>
          <p className="muted">Додайте замовника й договір — після цього можна створювати документи.</p>
          <Link className="btn btn-primary" to="/admin/counterparties/new">
            Додати замовника
          </Link>
        </div>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <article key={item.id} className="card">
              <div className="card-row">
                <div>
                  <div className="card-row-head">
                    <h2 className="card-title">{item.name}</h2>
                    <span className="badge">{item.type === 'tov' ? 'ТОВ' : 'ФОП'}</span>
                    {!item.isActive && <span className="badge">вимкнено</span>}
                  </div>
                  <p className="muted small">
                    {item.taxIdLabel}: {item.taxId}
                    {item.ipn ? ` · ІПН ${item.ipn}` : ''}
                  </p>
                  <p className="muted small">{item.legalAddress}</p>
                </div>
                <div className="card-actions">
                  <Link className="btn btn-ghost btn-sm" to={`/admin/counterparties/${item.id}`}>
                    Редагувати
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger-text"
                    onClick={() => void remove(item)}
                    disabled={busyId === item.id}
                  >
                    Видалити
                  </button>
                </div>
              </div>

              {item.contracts.length === 0 ? (
                <p className="muted small">Договорів немає — додайте хоча б один.</p>
              ) : (
                <ul className="contract-list">
                  {item.contracts.map((contract) => (
                    <li key={contract.id} className={contract.isActive ? '' : 'is-inactive'}>
                      <span className="contract-number">№ {contract.number}</span>
                      <span className="contract-date">від {formatDateShort(contract.date)}</span>
                      <span className="contract-service">{contract.serviceLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
