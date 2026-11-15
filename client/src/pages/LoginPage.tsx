import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { PublicConfig } from '@rekvizyt/shared'
import { api, errorMessage } from '../api'
import { useAuth } from '../auth'

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential: string }) => void
      }) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existing = document.getElementById('gsi-script') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google Sign-In недоступний')))
      return
    }

    const script = document.createElement('script')
    script.id = 'gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Не вдалося завантажити Google Sign-In'))
    document.head.appendChild(script)
  })
}

export function LoginPage() {
  const { user, loginWithGoogle, devLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const buttonRef = useRef<HTMLDivElement>(null)

  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  useEffect(() => {
    api
      .get<PublicConfig>('/api/config')
      .then(setConfig)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    if (!config?.googleClientId) return
    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (response) => {
            setBusy(true)
            setError(null)
            loginWithGoogle(response.credential)
              .then(() => navigate(from, { replace: true }))
              .catch((err) => setError(errorMessage(err)))
              .finally(() => setBusy(false))
          },
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          locale: 'uk',
          width: 300,
        })
      })
      .catch((err) => setError(errorMessage(err)))

    return () => {
      cancelled = true
    }
  }, [config, from, loginWithGoogle, navigate])

  if (user) return <Navigate to={from} replace />

  const handleDevLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      await devLogin()
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark brand-mark-lg" aria-hidden="true">
            Р
          </span>
          <div>
            <h1 className="login-title">Реквізити</h1>
            <p className="login-subtitle">Рахунки та акти наданих послуг</p>
          </div>
        </div>

        <p className="login-text">
          Сервіс приватний: вхід лише для дозволених акаунтів. Якщо вам потрібен доступ -
          зверніться до власника.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {!config && !error && <p className="muted">Завантаження…</p>}

        {config && config.googleClientId && (
          <div className="login-google">
            <div ref={buttonRef} />
          </div>
        )}

        {config && config.devLogin && (
          <div className="login-dev">
            <div className="login-divider">
              <span>локальна розробка</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => void handleDevLogin()}
              disabled={busy}
            >
              {busy ? 'Вхід…' : 'Увійти як локальний адміністратор'}
            </button>
            <p className="hint">
              DEV_LOGIN=1 у .env. У production цей спосіб вимкнений.
            </p>
          </div>
        )}

        {config && !config.googleClientId && !config.devLogin && (
          <div className="alert alert-warning">
            Вхід не налаштований. Додайте <code>GOOGLE_CLIENT_ID</code> та{' '}
            <code>ALLOWED_EMAILS</code> у <code>.env</code>.
          </div>
        )}
      </div>
    </div>
  )
}
