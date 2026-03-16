/**
 * SHES Tests – Auth Context
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { tokenStorage } from '@/api/client'

// ─── Mock the API services ────────────────────────────────────────────────────
vi.mock('@/api/services', () => ({
  authApi: {
    login:      vi.fn(),
    register:   vi.fn(),
    logout:     vi.fn(),
    getProfile: vi.fn(),
  },
}))

import { authApi } from '@/api/services'

const mockUser = {
  id: 'abc123',
  email: 'test@shes.ke',
  first_name: 'Jane',
  last_name: 'Otieno',
  full_name: 'Jane Otieno',
  role: 'patient' as const,
  date_of_birth: null,
  phone_number: '',
  county: 'Nairobi',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

// Helper to render a component that consumes AuthContext
function AuthConsumer() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div>Loading...</div>
  return (
    <div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user">{user?.email ?? 'none'}</div>
    </div>
  )
}

function renderWithAuth() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </BrowserRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  beforeEach(() => {
    tokenStorage.clear()
    vi.clearAllMocks()
  })

  it('starts unauthenticated when no token in storage', async () => {
    renderWithAuth()
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
    })
  })

  it('fetches profile on mount when token exists', async () => {
    tokenStorage.setAccess('mock-token')
    vi.mocked(authApi.getProfile).mockResolvedValue(mockUser)

    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@shes.ke')
    })
  })

  it('clears auth state when profile fetch fails', async () => {
    tokenStorage.setAccess('expired-token')
    vi.mocked(authApi.getProfile).mockRejectedValue(new Error('Unauthorized'))

    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(tokenStorage.getAccess()).toBeNull()
    })
  })

  it('sets user after successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access: 'acc', refresh: 'ref' })
    vi.mocked(authApi.getProfile).mockResolvedValue(mockUser)

    function LoginConsumer() {
      const { login, user } = useAuth()
      return (
        <div>
          <button onClick={() => login({ email: 'test@shes.ke', password: 'pass' })}>Login</button>
          <div data-testid="name">{user?.first_name ?? 'none'}</div>
        </div>
      )
    }

    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginConsumer />
        </AuthProvider>
      </BrowserRouter>
    )

    await act(async () => {
      screen.getByText('Login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('name').textContent).toBe('Jane')
    })
  })

  it('clears user on logout', async () => {
    tokenStorage.setTokens('acc', 'ref')
    vi.mocked(authApi.getProfile).mockResolvedValue(mockUser)
    vi.mocked(authApi.logout).mockResolvedValue()

    function LogoutConsumer() {
      const { logout, user } = useAuth()
      return (
        <div>
          <button onClick={() => logout()}>Logout</button>
          <div data-testid="name">{user?.first_name ?? 'none'}</div>
        </div>
      )
    }

    render(
      <BrowserRouter>
        <AuthProvider>
          <LogoutConsumer />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('name').textContent).toBe('Jane')
    })

    await act(async () => {
      screen.getByText('Logout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('name').textContent).toBe('none')
      expect(tokenStorage.getAccess()).toBeNull()
    })
  })

  it('throws if useAuth is used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Orphan() {
      useAuth()
      return null
    }
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within <AuthProvider>')
    consoleError.mockRestore()
  })
})
