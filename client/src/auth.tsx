import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionUser } from '@rekvizyt/shared'
import { api } from './api'

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  loginWithGoogle: (credential: string) => Promise<void>
  devLogin: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get<SessionUser>('/api/auth/me')
      .then((data) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    const data = await api.post<SessionUser>('/api/auth/google', { credential })
    setUser(data)
  }, [])

  const devLogin = useCallback(async () => {
    const data = await api.post<SessionUser>('/api/auth/dev-login')
    setUser(data)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, loginWithGoogle, devLogin, logout }),
    [user, loading, loginWithGoogle, devLogin, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth треба викликати всередині AuthProvider')
  return ctx
}
