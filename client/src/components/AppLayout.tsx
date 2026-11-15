import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-center muted">Завантаження…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

const NAV = [
  { to: '/admin', label: 'Документи', end: true },
  { to: '/admin/counterparties', label: 'Замовники' },
  { to: '/admin/profiles', label: 'Мої реквізити' },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              Р
            </span>
            <span className="brand-text">
              <strong>Реквізити</strong>
              <span className="brand-sub">рахунки та акти</span>
            </span>
          </div>

          <nav className="main-nav" aria-label="Основна навігація">
            {NAV.map((item) => {
              const active = item.end
                ? location.pathname === item.to ||
                  location.pathname.startsWith('/admin/documents')
                : location.pathname.startsWith(item.to)
              return (
                <NavItem key={item.to} to={item.to} active={active}>
                  {item.label}
                </NavItem>
              )
            })}
          </nav>

          <div className="header-user">
            <span className="header-email" title={user?.email}>
              {user?.email}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void logout()}>
              Вийти
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer no-print">
        <span>Внутрішній сервіс · дані зберігаються на вашому сервері</span>
      </footer>
    </div>
  )
}

function NavItem({
  to,
  active,
  children,
}: {
  to: string
  active: boolean
  children: React.ReactNode
}) {
  // active-стан рахуємо самі: документи мають вкладені маршрути.
  return (
    <Link
      className={`nav-link${active ? ' is-active' : ''}`}
      to={to}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
