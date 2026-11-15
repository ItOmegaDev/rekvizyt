import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  formatDateShort,
  formatMoney,
  type DocumentDetail,
} from '@rekvizyt/shared'
import { api, errorMessage } from '../api'
import { ActSheet } from '../components/ActSheet'
import { InvoiceSheet } from '../components/InvoiceSheet'

type ViewMode = 'invoice' | 'act' | 'both'

const MODES: Array<{ id: ViewMode; label: string }> = [
  { id: 'invoice', label: 'Рахунок' },
  { id: 'act', label: 'Акт' },
  { id: 'both', label: 'Обидва' },
]

export function DocumentViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [mode, setMode] = useState<ViewMode>('both')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setDoc(await api.get<DocumentDetail>(`/api/documents/${id}`))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const duplicate = async () => {
    if (!doc) return
    setBusy(true)
    setError(null)
    try {
      const copy = await api.post<DocumentDetail>(`/api/documents/${doc.id}/duplicate`)
      navigate(`/admin/documents/${copy.id}/edit`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!doc) return
    if (
      !window.confirm(
        `Видалити документ № ${doc.number} від ${formatDateShort(doc.issuedAt)}?\nЦю дію не можна скасувати.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.del(`/api/documents/${doc.id}`)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <div className="page-center muted">Завантаження…</div>
  if (error && !doc) return <div className="alert alert-error">{error}</div>
  if (!doc) return <div className="alert alert-error">Документ не знайдено</div>

  return (
    <div className="stack">
      <div className="page-head no-print">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Документи</Link> <span>/</span> № {doc.number}
          </div>
          <h1 className="page-title">
            {doc.counterparty.name} · {formatMoney(doc.totalMinor)} грн
          </h1>
          <p className="page-subtitle">
            Договір № {doc.contract.number} від {formatDateShort(doc.contract.date)} ·{' '}
            {formatDateShort(doc.issuedAt)}
          </p>
        </div>
        <div className="toolbar">
          <Link className="btn btn-ghost" to={`/admin/documents/${doc.id}/edit`}>
            Редагувати
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => void duplicate()} disabled={busy}>
            Повторити
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Друк / PDF
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-danger-text"
            onClick={() => void remove()}
            disabled={busy}
          >
            Видалити
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error no-print">{error}</div>}

      <div className="view-tabs no-print" role="tablist" aria-label="Що показати">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            className={`tab${mode === item.id ? ' is-active' : ''}`}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
        <span className="tabs-hint muted small">
          Друк: A4 · для PDF виберіть «Зберегти як PDF» у діалозі друку
        </span>
      </div>

      <div className={`print-area print-mode-${mode}`}>
        {mode !== 'act' && <InvoiceSheet doc={doc} />}
        {mode !== 'invoice' && <ActSheet doc={doc} />}
      </div>
    </div>
  )
}
