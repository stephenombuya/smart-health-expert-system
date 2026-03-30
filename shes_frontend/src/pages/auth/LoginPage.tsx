/**
 * SHES Login Page
 * Email + password sign-in with react-hook-form + zod validation.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ErrorMessage } from '@/components/common'
import { extractApiError } from '@/utils'

// ─── Validation schema ────────────────────────────────────────────────────────
const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const [apiError, setApiError]     = useState('')
  const [showPassword, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      await login(data)
      navigate(from, { replace: true })
    } catch (err) {
      setApiError(extractApiError(err) || 'Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 flex-col justify-between p-12 relative overflow-hidden">
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
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary-800 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-primary-900 font-display">SHES</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 font-display mb-1">
            {t('auth.welcomeBack')}
          </h2>
          <p className="text-sm text-gray-500 font-body mb-8">
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
                className="text-xs text-primary-700 font-semibold hover:underline font-body"
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
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 font-body">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-700 font-semibold hover:underline">
              {t('auth.createOne')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
