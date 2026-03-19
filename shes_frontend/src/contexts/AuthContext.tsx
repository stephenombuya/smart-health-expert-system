/**
 * SHES Auth Context
 * Fixed version — uses a ref to guarantee profile is only fetched once on mount,
 * preventing the repeated GET /auth/profile/ hammering.
 */
import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react'
import { authApi } from '@/api/services'
import { tokenStorage } from '@/api/client'
import type { User, LoginPayload, RegisterPayload } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login:       (payload: LoginPayload) => Promise<void>
  register:    (payload: RegisterPayload) => Promise<void>
  logout:      () => Promise<void>
  refreshUser: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [isLoading, setLoading] = useState(true)

  // This ref ensures the initial profile fetch runs ONCE only,
  // even in React StrictMode (which mounts components twice in development).
  const initialized = useRef(false)

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getProfile()
      setUser(profile)
    } catch {
      tokenStorage.clear()
      setUser(null)
    }
  }, [])

  // ── On mount: validate existing token once ─────────────────────────────────
 useEffect(() => {
  // StrictMode mounts twice. On the second mount the ref is already true
  // but state has reset, so we must still resolve the loading state.
  if (initialized.current) {
    setLoading(false)   // ← prevents infinite loading on StrictMode remount
    return
  }
  initialized.current = true

  const init = async () => {
    if (tokenStorage.getAccess()) {
      await refreshUser()
    }
    setLoading(false)
  }

  init()
}, []) // ← empty dependency array — intentional, runs once on mount

  // ── Actions ────────────────────────────────────────────────────────────────

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await authApi.login(payload)
    tokenStorage.setTokens(tokens.access, tokens.refresh)
    const profile = await authApi.getProfile()
    setUser(profile)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await authApi.register(payload)
    await login({ email: payload.email, password: payload.password })
  }, [login])

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh()
    if (refresh) {
      try { await authApi.logout(refresh) } catch { /* ignore blacklist errors */ }
    }
    tokenStorage.clear()
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}