import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  formatDateShort,
  formatMoney,
  todayISO,
  type DocumentDetail,
  type DocumentSummary,
} from '@rekvizyt/shared'
import { api, errorMessage } from '../api'

export function DocumentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<DocumentSummary[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [onlyUnpaid, setOnlyUnpaid] = useState(false)
  const [paidEditId, setPaidEditId] = useState<string | null>(null)

  const displayed = onlyUnpaid ? items.filter((d) => d.paidAt === null) : items
  const unpaidCount = items.filter((d) => d.paidAt === null).length
  const unpaidTotal = items
    .filter((d) => d.paidAt === null)
    .reduce((sum, d) => sum + d.totalMinor, 0)

  const load = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<{ items: DocumentSummary[] }>(
        `/api/documents?q=${encodeURIComponent(search)}`,
      )
      setItems(data.items)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load('')
  }, [load])

  const duplicate = async (doc: DocumentSummary) => {
    setBusyId(doc.id)
    setError(null)
    try {
      const copy = await api.post<DocumentDetail>(`/api/documents/${doc.id}/duplicate`)
      navigate(`/admin/documents/${copy.id}/edit`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const setPaid = async (doc: DocumentSummary, paid: boolean, paidAt?: string) => {
    setBusyId(doc.id)
    setError(null)
    try {
      const body = paid ? { paid: true, paidAt: paidAt || todayISO() } : { paid: false }
      const updated = await api.patch<DocumentDetail>(`/api/documents/${doc.id}/paid`, body)
      setItems((prev) =>
        prev.map((item) =>
          item.id === doc.id ? { ...item, paidAt: updated.paidAt } : item,
        ),
      )
      setPaidEditId(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (doc: DocumentSummary) => {
    if (
      !window.confirm(
        `Видалити документ № ${doc.number} від ${formatDateShort(doc.issuedAt)}?\nЦю дію не можна скасувати.`,
      )
    ) {
      return
    }
    setBusyId(doc.id)
    setError(null)
    try {
      await api.del(`/api/documents/${doc.id}`)
      await load(query)
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
          <h1 className="page-title">Документи</h1>
          <p className="page-subtitle">
            Рахунок і акт створюються парою: одна дата, один номер, один набір позицій.
          </p>
        </div>
        <Link className="btn btn-primary" to="/admin/documents/new">
          Новий документ
        </Link>
      </div>

      <div className="card">
        <form
          className="search-row"
          onSubmit={(event) => {
            event.preventDefault()
            void load(query)
          }}
        >
          <input
            className="input"
            type="search"
            placeholder="Пошук за номером, замовником або послугою"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Пошук документів"
          />
          <button type="submit" className="btn btn-secondary">
            Знайти
          </button>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && items.length > 0 && (
          <div className="paid-summary">
            <span>
              Боржників: <strong>{unpaidCount}</strong> з {items.length} · не сплачено:{' '}
              <strong>{formatMoney(unpaidTotal)}</strong> грн
            </span>
            <button
              type="button"
              className={`btn btn-sm ${onlyUnpaid ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setOnlyUnpaid((v) => !v)}
            >
              {onlyUnpaid ? 'Показати всі' : 'Тільки боржники'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="muted">Завантаження…</p>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">
              {onlyUnpaid ? 'Боржників немає - усі документи сплачені' : query ? 'Нічого не знайдено' : 'Ще немає жодного документа'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Номер</th>
                  <th>Замовник</th>
                  <th className="col-service">Послуга</th>
                  <th className="text-right">Сума</th>
                  <th>Оплата</th>
                  <th aria-label="Дії" />
                </tr>
              </thead>
              <tbody>
                {displayed.map((doc) => (
                  <tr key={doc.id} className={doc.paidAt ? 'row-paid' : undefined}>
                    <td className="nowrap">{formatDateShort(doc.issuedAt)}</td>
                    <td>
                      <span className="doc-number">{doc.number}</span>
                    </td>
                    <td>
                      <Link className="table-link" to={`/admin/documents/${doc.id}`}>
                        {doc.counterpartyName}
                      </Link>
                      <div className="table-sub">Договір № {doc.contractNumber}</div>
                    </td>
                    <td className="col-service muted">{doc.serviceType}</td>
                    <td className="text-right nowrap">
                      <strong>{formatMoney(doc.totalMinor)}</strong>
                    </td>
                    <td className="nowrap paid-cell">
                      {paidEditId === doc.id ? (
                        <div className="paid-editor">
                          <input
                            className="input input-sm"
                            type="date"
                            defaultValue={doc.paidAt ?? todayISO()}
                            disabled={busyId === doc.id}
                            aria-label="Дата оплати"
                            onChange={(event) => {
                              if (event.target.value) {
                                void setPaid(doc, true, event.target.value)
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPaidEditId(null)}
                          >
                            Скасувати
                          </button>
                        </div>
                      ) : (
                        <div className="paid-toggle">
                          <label className="paid-check">
                            <input
                              type="checkbox"
                              checked={doc.paidAt !== null}
                              disabled={busyId === doc.id}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  void setPaid(doc, true)
                                } else {
                                  void setPaid(doc, false)
                                }
                              }}
                            />
                            <span className={doc.paidAt ? 'paid-label is-paid' : 'paid-label is-debtor'}>
                              {doc.paidAt ? 'Сплачено' : 'Борг'}
                            </span>
                          </label>
                          {doc.paidAt && (
                            <button
                              type="button"
                              className="paid-date"
                              onClick={() => setPaidEditId(doc.id)}
                              title="Змінити дату оплати"
                            >
                              {formatDateShort(doc.paidAt)}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link className="btn btn-ghost btn-sm" to={`/admin/documents/${doc.id}`}>
                          Відкрити
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void duplicate(doc)}
                          disabled={busyId === doc.id}
                        >
                          Повторити
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger-text"
                          onClick={() => void remove(doc)}
                          disabled={busyId === doc.id}
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
      </div>
    </div>
  )
}
