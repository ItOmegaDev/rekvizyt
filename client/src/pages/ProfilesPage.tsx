import { useCallback, useEffect, useState } from 'react'
import type { OkResponse, Profile } from '@rekvizyt/shared'
import { api, errorMessage } from '../api'
import { Field } from '../components/Field'

interface ProfileFormState {
  label: string
  name: string
  fullName: string
  address: string
  taxId: string
  iban: string
  bankName: string
  mfo: string
  phone: string
  taxNote: string
  signerName: string
  signerPosition: string
  registrationRecord: string
  isDefault: boolean
  isActive: boolean
}

const EMPTY: ProfileFormState = {
  label: '',
  name: 'ФОП Кучеренко Олексій Володимирович',
  fullName: 'Фізична особа-підприємець Кучеренко Олексій Володимирович',
  address: '',
  taxId: '',
  iban: '',
  bankName: '',
  mfo: '',
  phone: '',
  taxNote: '',
  signerName: 'Олексій КУЧЕРЕНКО',
  signerPosition: 'Фізична особа-підприємець',
  registrationRecord: '',
  isDefault: false,
  isActive: true,
}

export function ProfilesPage() {
  const [items, setItems] = useState<Profile[]>([])
  const [form, setForm] = useState<ProfileFormState>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ items: Profile[] }>('/api/profiles')
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

  const openNew = () => {
    setForm({ ...EMPTY, isDefault: items.length === 0 })
    setEditingId(null)
    setFormOpen(true)
    setError(null)
    setNotice(null)
  }

  const openEdit = (profile: Profile) => {
    setForm({
      label: profile.label,
      name: profile.name,
      fullName: profile.fullName,
      address: profile.address,
      taxId: profile.taxId,
      iban: profile.iban,
      bankName: profile.bankName,
      mfo: profile.mfo,
      phone: profile.phone,
      taxNote: profile.taxNote,
      signerName: profile.signerName,
      signerPosition: profile.signerPosition,
      registrationRecord: profile.registrationRecord,
      isDefault: profile.isDefault,
      isActive: profile.isActive,
    })
    setEditingId(profile.id)
    setFormOpen(true)
    setError(null)
    setNotice(null)
  }

  const close = () => {
    setFormOpen(false)
    setEditingId(null)
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await api.put<Profile>(`/api/profiles/${editingId}`, form)
      } else {
        await api.post<Profile>('/api/profiles', form)
      }
      await load()
      close()
      setNotice('Реквізити збережено.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (profile: Profile) => {
    if (!window.confirm(`Видалити реквізити «${profile.label}»?`)) return
    setError(null)
    setNotice(null)
    try {
      const result = await api.del<OkResponse>(`/api/profiles/${profile.id}`)
      await load()
      setNotice(
        result.deactivated
          ? 'Реквізити використовуються в документах, тому їх вимкнено, а не видалено.'
          : 'Реквізити видалено.',
      )
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Мої реквізити</h1>
          <p className="page-subtitle">
            Варіанти ваших банківських реквізитів. Під час створення документа вибирається один із
            них.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Додати реквізити
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-info">{notice}</div>}

      {formOpen && (
        <form className="card" onSubmit={submit}>
          <h2 className="card-title">{editingId ? 'Редагувати реквізити' : 'Нові реквізити'}</h2>

          <div className="form-grid">
            <Field label="Назва для вибору" hint="Наприклад: «ПриватБанк», «УНІВЕРСАЛ БАНК»">
              <input
                className="input"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
                maxLength={60}
              />
            </Field>
            <Field label="Повне ім’я (у рахунку)">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Юридична назва (у вступі акта)" wide>
              <input
                className="input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </Field>
            <Field label="Адреса" wide>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </Field>
            <Field label="ЄДРПОУ / РНОКПП">
              <input
                className="input"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                required
                inputMode="numeric"
              />
            </Field>
            <Field label="IBAN">
              <input
                className="input mono"
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
                required
                placeholder="UA..."
              />
            </Field>
            <Field label="Банк">
              <input
                className="input"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                required
              />
            </Field>
            <Field label="МФО">
              <input
                className="input"
                value={form.mfo}
                onChange={(e) => setForm({ ...form, mfo: e.target.value })}
                inputMode="numeric"
                maxLength={6}
              />
            </Field>
            <Field label="Телефон">
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Податкова примітка" hint="Наприклад: «Платник єдиного податку, 3-я група»">
              <input
                className="input"
                value={form.taxNote}
                onChange={(e) => setForm({ ...form, taxNote: e.target.value })}
              />
            </Field>
            <Field label="Підпис у документах">
              <input
                className="input"
                value={form.signerName}
                onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                required
              />
            </Field>
            <Field label="Посада для підпису">
              <input
                className="input"
                value={form.signerPosition}
                onChange={(e) => setForm({ ...form, signerPosition: e.target.value })}
                required
              />
            </Field>
            <Field label="Запис у ЄДР (для акта)" hint="Номер запису ФОП в Єдиному державному реєстрі">
              <input
                className="input"
                value={form.registrationRecord}
                onChange={(e) => setForm({ ...form, registrationRecord: e.target.value })}
              />
            </Field>
          </div>

          <div className="form-checks">
            <label className="check">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Використовувати за замовчуванням
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Активні
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Збереження…' : editingId ? 'Зберегти зміни' : 'Додати'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={close}>
              Скасувати
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Завантаження…</p>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-title">Ще немає жодних реквізитів</p>
          <p className="muted">Додайте хоча б один банк — без нього не створити документ.</p>
        </div>
      ) : (
        <div className="card-grid">
          {items.map((profile) => (
            <article key={profile.id} className="card profile-card">
              <div className="profile-card-head">
                <h2 className="card-title">{profile.label}</h2>
                {profile.isDefault && <span className="badge badge-accent">типові</span>}
              </div>
              <p className="profile-name">{profile.name}</p>
              <dl className="req-list">
                <div>
                  <dt>IBAN</dt>
                  <dd className="mono">{profile.iban}</dd>
                </div>
                <div>
                  <dt>Банк</dt>
                  <dd>
                    {profile.bankName}
                    {profile.mfo ? `, МФО ${profile.mfo}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>ЄДРПОУ</dt>
                  <dd>{profile.taxId}</dd>
                </div>
                {profile.phone && (
                  <div>
                    <dt>Телефон</dt>
                    <dd>{profile.phone}</dd>
                  </div>
                )}
                {profile.taxNote && (
                  <div>
                    <dt>Податки</dt>
                    <dd>{profile.taxNote}</dd>
                  </div>
                )}
              </dl>
              <div className="card-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(profile)}>
                  Редагувати
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger-text"
                  onClick={() => void remove(profile)}
                >
                  Видалити
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
