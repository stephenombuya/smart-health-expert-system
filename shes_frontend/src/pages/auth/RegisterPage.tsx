// src/pages/RegisterPage.tsx

/**
 * SHES Register Page
 * New patient/doctor account creation with full validation and terms acceptance.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Mail, Lock, User, Phone, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { ErrorMessage } from '@/components/common'
import { PageLayout } from '@/components/layout/PageLayout'
import { extractApiError } from '@/utils'

const KENYA_COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Kiambu','Machakos',
  'Meru','Nyeri','Kisii','Kakamega','Uasin Gishu','Kilifi','Kwale',
  'Murang\'a','Embu','Isiolo','Marsabit','Garissa','Wajir','Mandera',
  'Turkana','West Pokot','Samburu','Trans-Nzoia','Baringo','Laikipia',
  'Nyandarua','Kirinyaga','Tharaka-Nithi','Kitui','Makueni','Nandi',
  'Bomet','Kericho','Siaya','Homa Bay','Migori','Nyamira','Vihiga',
  'Bungoma','Busia','Taita-Taveta','Lamu','Tana River','Kajiado',
  'Narok',
].sort()

const schema = z.object({
  first_name:       z.string().min(2, 'First name must be at least 2 characters'),
  last_name:        z.string().min(2, 'Last name must be at least 2 characters'),
  email:            z.string().email('Enter a valid email address'),
  phone_number:     z.string().optional(),
  county:           z.string().optional(),
  role:             z.enum(['patient', 'doctor']),
  password:         z.string().min(10, 'Password must be at least 10 characters'),
  password_confirm: z.string(),
  accept_terms:     z.boolean().refine(val => val === true, {
    message: 'You must accept the Terms of Use and Privacy Policy',
  }),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const [showTermsDetails, setShowTermsDetails] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

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
    defaultValues: { 
      role: 'patient',
      accept_terms: false 
    },
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      // Remove accept_terms from the data sent to the API
      const { accept_terms, ...userData } = data
      await registerUser(userData)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setApiError(extractApiError(err))
    }
  }

  return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 relative">
        {/* Theme Toggle Button - positioned absolutely */}
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
        </button>

        <div className="w-full max-w-md animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-800 mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">{t('auth.createAccount')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-body mt-1">{t('auth.joinShes')}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-gray-100 dark:border-gray-800 p-6">
            {apiError && <div className="mb-5"><ErrorMessage message={apiError} /></div>}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="first_name" 
                  label={t('auth.firstName')} 
                  placeholder="Jane" 
                  required
                  leftAddon={<User className="w-4 h-4" />}
                  error={errors.first_name?.message}
                  {...register('first_name')}
                />
                <Input
                  id="last_name" 
                  label={t('auth.lastName')} 
                  placeholder="Otieno" 
                  required
                  error={errors.last_name?.message}
                  {...register('last_name')}
                />
              </div>

              <Input
                id="email" 
                type="email" 
                label={t('auth.email')}
                placeholder="you@example.com" 
                required
                leftAddon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="phone_number" 
                  label={t('auth.phone')}
                  placeholder="+254712345678"
                  leftAddon={<Phone className="w-4 h-4" />}
                  error={errors.phone_number?.message}
                  {...register('phone_number')}
                />
                <Select
                  id="county"
                  label={t('auth.county')}
                  placeholder="Select County"
                  options={KENYA_COUNTIES.map((c) => ({ value: c, label: c }))}
                  error={errors.county?.message}
                  {...register('county')}
                />
              </div>

              <Select
                id="role" 
                label={t('auth.role')} 
                required
                options={[
                  { value: 'patient', label: t('auth.patient') },
                  { value: 'doctor',  label: t('auth.doctor') },
                ]}
                error={errors.role?.message}
                {...register('role')}
              />

              <Input
                id="password" 
                type="password" 
                label={t('auth.password')}
                placeholder="••••••••••••••••••" 
                required
                leftAddon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                helper="Password must be at least 10 characters"
                {...register('password')}
              />

              <Input
                id="password_confirm" 
                type="password" 
                label={t('auth.confirmPassword')}
                placeholder="••••••••••••••••••" 
                required
                leftAddon={<Lock className="w-4 h-4" />}
                error={errors.password_confirm?.message}
                helper="Re-enter your password"
                {...register('password_confirm')}
              />

              {/* Terms and Conditions Checkbox */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                    {...register('accept_terms')}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-body">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsDetails(!showTermsDetails)}
                      className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                    >
                      Terms of Use
                    </button>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.accept_terms && (
                  <p className="text-sm text-red-600 dark:text-red-400 font-body">
                    {errors.accept_terms.message}
                  </p>
                )}

                {/* Expandable Terms Summary */}
                {showTermsDetails && (
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Summary of Terms:</p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-disc pl-4">
                      <li>AI-generated health information is not medical advice</li>
                      <li>You are responsible for your account security</li>
                      <li>SHES is not liable for damages from platform use</li>
                      <li>You agree to use the platform only for lawful purposes</li>
                    </ul>
                    <Link 
                      to="/terms" 
                      className="inline-block text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                      target="_blank"
                    >
                      Read full Terms of Use →
                    </Link>
                  </div>
                )}
              </div>

              <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-2">
                {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400 font-body">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary-700 dark:text-primary-400 font-semibold hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  )
}