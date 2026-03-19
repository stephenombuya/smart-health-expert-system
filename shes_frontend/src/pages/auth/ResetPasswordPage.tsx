/**
 * SHES Reset Password Page
 * Step 2 — user arrives via link in email:
 * http://localhost:3000/reset-password?token=<token>
 */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { authApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ErrorMessage } from '@/components/common'
import { extractApiError } from '@/utils'

const schema = z.object({
  new_password: z.string().min(10, 'Password must be at least 10 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token') ?? ''
  const [done, setDone]         = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  // Missing token guard
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 font-display mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-sm text-gray-500 font-body mb-6">
            This password reset link is missing or malformed. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button fullWidth>Request New Link</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
            Password Reset!
          </h1>
          <p className="text-sm text-gray-500 font-body mb-8">
            Your password has been updated. Sign in with your new password.
          </p>
          <Button fullWidth onClick={() => navigate('/login')}>
            Sign In Now
          </Button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      await authApi.confirmPasswordReset(token, data.new_password)
      setDone(true)
    } catch (err) {
      const msg = extractApiError(err)
      setApiError(
        msg.includes('expired') || msg.includes('Invalid')
          ? 'This reset link has expired or already been used. Please request a new one.'
          : msg
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-800 mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Set new password</h1>
          <p className="text-sm text-gray-500 font-body mt-1">
            Choose a strong password for your SHES account
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          {apiError && (
            <div className="mb-5">
              <ErrorMessage message={apiError} />
              {(apiError.includes('expired') || apiError.includes('already been used')) && (
                <div className="mt-3">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-700 font-semibold hover:underline"
                  >
                    → Request a new reset link
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              id="new_password"
              type={showPass ? 'text' : 'password'}
              label="New password"
              placeholder="Min. 10 characters"
              autoComplete="new-password"
              required
              leftAddon={<Lock className="w-4 h-4" />}
              rightAddon={
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="focus:outline-none"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              helper="At least 10 characters with letters and numbers"
              error={errors.new_password?.message}
              {...register('new_password')}
            />

            <Input
              id="confirm_password"
              type={showPass ? 'text' : 'password'}
              label="Confirm new password"
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
              leftAddon={<Lock className="w-4 h-4" />}
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              Reset Password
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500 font-body">
          Back to{' '}
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}