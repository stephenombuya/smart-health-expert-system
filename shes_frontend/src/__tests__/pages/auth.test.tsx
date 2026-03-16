/**
 * SHES Tests – Auth Pages (Login & Register)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

vi.mock('@/api/services', () => ({
  authApi: {
    login:      vi.fn(),
    register:   vi.fn(),
    logout:     vi.fn(),
    getProfile: vi.fn().mockResolvedValue(null),
  },
}))

import { authApi } from '@/api/services'

function setup(component: React.ReactNode, path = '/login') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
          {component}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields', () => {
    setup(null)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders Sign In button', () => {
    setup(null)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation error for empty email', async () => {
    setup(null)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for empty password', async () => {
    setup(null)
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@test.ke')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('calls login with email and password on submit', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access: 'acc', refresh: 'ref' })
    vi.mocked(authApi.getProfile).mockResolvedValue({
      id: '1', email: 'jane@test.ke', first_name: 'Jane', last_name: 'Doe',
      full_name: 'Jane Doe', role: 'patient', date_of_birth: null,
      phone_number: '', county: '', is_active: true, created_at: '',
    })

    setup(null)
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@test.ke')
    await userEvent.type(screen.getByLabelText(/password/i), 'MyPassword@2024!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'jane@test.ke', password: 'MyPassword@2024!',
      })
    })
  })

  it('shows API error message on login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { data: { error: { detail: 'Invalid credentials.' } } },
    })

    setup(null)
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@test.ke')
    await userEvent.type(screen.getByLabelText(/password/i), 'WrongPass!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('has a link to register page', () => {
    setup(null)
    expect(screen.getByText(/create one/i)).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    setup(null)
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')
    await userEvent.click(screen.getByLabelText(/show password/i))
    expect(passwordInput.type).toBe('text')
  })
})

// ─── RegisterPage ─────────────────────────────────────────────────────────────
describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all form fields', () => {
    setup(null, '/register')
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    setup(null, '/register')
    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Otieno')
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@test.ke')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'Password@2024!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Different@2024!')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('has a link back to login', () => {
    setup(null, '/register')
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })
})
