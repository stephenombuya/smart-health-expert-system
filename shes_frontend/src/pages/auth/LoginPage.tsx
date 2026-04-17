// src/pages/LoginPage.tsx

/**
 * SHES Login Page
 * Email + password sign-in with react-hook-form + zod validation and theme toggle.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Mail, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { tokenStorage } from '@/api/client'
import { GoogleLogin } from '@react-oauth/google'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ErrorMessage } from '@/components/common'
import { PageLayout } from '@/components/layout/PageLayout'
import { authApi } from '@/api/services'
import { extractApiError } from '@/utils'

// ─── Validation schema ────────────────────────────────────────────────────────
const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, refreshUser } = useAuth()
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const [apiError, setApiError]     = useState('')
  const [showPassword, setShowPass] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const qc = useQueryClient()

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved === 'dark'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('theme', newMode ? 'dark' : 'light')
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return newMode
    })
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const user = await login(data)

      if (user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate(from || '/dashboard', { replace: true })
      }

    } catch (err) {
      setApiError(extractApiError(err) || 'Invalid email or password.')
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential
    if (!idToken) {
      setApiError('Google Sign-In failed — no credential received.')
      return
    }

    try {
      const result = await authApi.googleSignIn(idToken)
      // Store tokens
      tokenStorage.setTokens(result.access, result.refresh)
      // Load the full user profile into AuthContext
      await refreshUser()
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err) {
      setApiError(extractApiError(err) || 'Google Sign-In failed. Please try again.')
    }
  }

  return (
    <PageLayout>
      <div className="min-h-screen flex relative">
        {/* Theme Toggle Button - positioned absolutely */}
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
        </button>

        {/* Left panel – branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary-900 dark:bg-primary-950 flex-col justify-between p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-800/60" />
            <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-primary-700/40" />
            <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-primary-600/20" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl font-display">SHES</span>
          </div>

          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white font-display leading-tight mb-4">
              Smart Health<br />Expert System
            </h1>
            <p className="text-primary-300 text-lg font-body leading-relaxed max-w-md">
              AI-driven clinical decision support designed for Kenya's
              healthcare context — triage, medication management, and
              chronic disease tracking in one place.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { label: 'Triage Engine', desc: 'Instant symptom assessment' },
                { label: 'Drug Interactions', desc: 'KEML-based checker' },
                { label: 'Chronic Tracking', desc: 'Glucose & BP monitoring' },
                { label: 'Mental Health', desc: 'Mood logging & coping' },
              ].map((f) => (
                <div key={f.label} className="bg-primary-800/50 rounded-xl p-3 border border-primary-700/50">
                  <p className="text-sm font-semibold text-white font-display">{f.label}</p>
                  <p className="text-xs text-primary-400 font-body mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-primary-600 font-body">
            © {new Date().getFullYear()} SHES
          </p>
        </div>

        {/* Right panel – form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-900">
          <div className="w-full max-w-sm animate-slide-up">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-primary-800 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-primary-900 dark:text-white font-display">SHES</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display mb-1">
              {t('auth.welcomeBack')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-body mb-8">
              {t('auth.signInSubtitle')}
            </p>

            {apiError && <div className="mb-5"><ErrorMessage message={apiError} /></div>}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                id="email"
                type="email"
                label={t('auth.email')}
                placeholder="you@example.com"
                autoComplete="email"
                required
                leftAddon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password')}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                leftAddon={<Lock className="w-4 h-4" />}
                rightAddon={
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-700 dark:text-primary-400 font-semibold hover:underline font-body"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={isSubmitting}
                className="mt-2"
              >
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </Button>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400 font-body">or</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setApiError('Google Sign-In was cancelled. Please try again.')}
                  useOneTap={false}
                  shape="rectangular"
                  size="large"
                  text="signin_with"
                  locale="en"
                />
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 font-body">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary-700 dark:text-primary-400 font-semibold hover:underline">
                {t('auth.createOne')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}