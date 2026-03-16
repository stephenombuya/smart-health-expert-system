/**
 * SHES Auth Context
 * Provides authentication state and actions to the entire app tree.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
  login:    (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout:   () => Promise<void>
  refreshUser: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /** Fetch the current user profile from the backend */
  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getProfile()
      setUser(profile)
    } catch {
      // Token expired / invalid → clear state
      tokenStorage.clear()
      setUser(null)
    }
  }, [])

  // On mount – if tokens exist in storage, validate them by fetching profile
  useEffect(() => {
    const init = async () => {
      if (tokenStorage.getAccess()) {
        await refreshUser()
      }
      setIsLoading(false)
    }
    init()
  }, [refreshUser])

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await authApi.login(payload)
    tokenStorage.setTokens(tokens.access, tokens.refresh)
    const profile = await authApi.getProfile()
    setUser(profile)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await authApi.register(payload)
    // Auto-login after registration
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth – consume authentication state anywhere in the tree.
 * Throws if used outside AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
