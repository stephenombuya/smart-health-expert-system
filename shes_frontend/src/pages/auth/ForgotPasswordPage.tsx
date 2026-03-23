/**
 * SHES Forgot Password Page
 * Step 1 of the password reset flow.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { ErrorMessage } from '@/components/common'
import { extractApiError } from '@/utils'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [apiError, setApiError]   = useState('')
  const { t } = useTranslation()

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      await authApi.requestPasswordReset(data.email)
      setSubmitted(true)
    } catch (err) {
      setApiError(extractApiError(err))
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
            {t('auth.checkInbox')}
          </h1>
          <p className="text-sm text-gray-500 font-body leading-relaxed mb-2">
            {t('auth.resetEmailSent', { email: getValues('email') })}
          </p>
          <p className="text-xs text-gray-400 font-body mb-8">
            {t('auth.resetLinkExpiry')}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800 font-display mb-1">
              {t('auth.devModeTitle')}
            </p>
            <p className="text-xs text-amber-700 font-body">
              {t('auth.devModeDescription')}
            </p>
          </div>

          <Link to="/login">
            <Button variant="secondary" fullWidth leftIcon={<ArrowLeft className="w-4 h-4" />}>
              {t('auth.backToSignIn')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-800 mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">{t('auth.forgotPasswordTitle')}</h1>
          <p className="text-sm text-gray-500 font-body mt-1">
            {t('auth.forgotPasswordSubtitle')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
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
            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              {t('auth.sendResetLink')}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500 font-body">
          {t('auth.rememberPassword')}{' '}
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}