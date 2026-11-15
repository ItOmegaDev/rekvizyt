import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout, ProtectedRoute } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'

const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
)
const DocumentEditorPage = lazy(() =>
  import('./pages/DocumentEditorPage').then((m) => ({ default: m.DocumentEditorPage })),
)
const DocumentViewPage = lazy(() =>
  import('./pages/DocumentViewPage').then((m) => ({ default: m.DocumentViewPage })),
)
const ProfilesPage = lazy(() =>
  import('./pages/ProfilesPage').then((m) => ({ default: m.ProfilesPage })),
)
const CounterpartiesPage = lazy(() =>
  import('./pages/CounterpartiesPage').then((m) => ({ default: m.CounterpartiesPage })),
)
const CounterpartyFormPage = lazy(() =>
  import('./pages/CounterpartyFormPage').then((m) => ({ default: m.CounterpartyFormPage })),
)

function Loading() {
  return <div className="page-center muted">Завантаження…</div>
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<DocumentsPage />} />
            <Route path="/admin/documents/new" element={<DocumentEditorPage />} />
            <Route path="/admin/documents/:id" element={<DocumentViewPage />} />
            <Route path="/admin/documents/:id/edit" element={<DocumentEditorPage />} />
            <Route path="/admin/profiles" element={<ProfilesPage />} />
            <Route path="/admin/counterparties" element={<CounterpartiesPage />} />
            <Route path="/admin/counterparties/new" element={<CounterpartyFormPage />} />
            <Route path="/admin/counterparties/:id" element={<CounterpartyFormPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}
