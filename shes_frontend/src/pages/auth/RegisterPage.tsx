/**
 * SHES Register Page
 * New patient/doctor account creation with full validation.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Mail, Lock, User, Phone, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { ErrorMessage } from '@/components/common'
import { extractApiError } from '@/utils'

const KENYA_COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kiambu','Machakos',
  'Meru','Nyeri','Kisii','Kakamega','Uasin Gishu','Kilifi','Kwale',
  'Murang\'a','Embu','Isiolo','Marsabit','Garissa','Wajir','Mandera',
  'Turkana','West Pokot','Samburu','Trans-Nzoia','Baringo','Laikipia',
  'Nyandarua','Kirinyaga','Tharaka-Nithi','Kitui','Makueni','Nandi',
  'Bomet','Kericho','Siaya','Homa Bay','Migori','Nyamira','Vihiga',
  'Bungoma','Busia','Taita-Taveta','Lamu','Tana River','Kajiado',
  'Narok','Nairobi Metropolitan',
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
}).refine((d) => d.password === d.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register: registerUser } = useAuth()
  const navigate  = useNavigate()
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient' },
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      await registerUser(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setApiError(extractApiError(err))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-800 mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">{t('auth.createAccount')}</h1>
          <p className="text-sm text-gray-500 font-body mt-1">{t('auth.joinShes')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          {apiError && <div className="mb-5"><ErrorMessage message={apiError} /></div>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="first_name" label={t('auth.firstName')} placeholder="Jane" required
                leftAddon={<User className="w-4 h-4" />}
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                id="last_name" label={t('auth.lastName')} placeholder="Otieno" required
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>

            <Input
              id="email" type="email" label={t('auth.email')}
              placeholder="you@example.com" required
              leftAddon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="phone_number" label={t('auth.phone')}
                placeholder="+254712345678"
                leftAddon={<Phone className="w-4 h-4" />}
                error={errors.phone_number?.message}
                {...register('phone_number')}
              />
              <Select
                id="county" label={t('auth.county')}
                placeholder={t('auth.selectCounty')}
                options={KENYA_COUNTIES.map((c) => ({ value: c, label: c }))}
                error={errors.county?.message}
                {...register('county')}
              />
            </div>

            <Select
              id="role" label={t('auth.role')} required
              options={[
                { value: 'patient', label: t('auth.patient') },
                { value: 'doctor',  label: t('auth.doctor') },
              ]}
              error={errors.role?.message}
              {...register('role')}
            />

            <Input
              id="password" type="password" label={t('auth.password')}
              placeholder={t('auth.minPassword')} required
              leftAddon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              helper={t('auth.passwordHelper')}
              {...register('password')}
            />

            <Input
              id="password_confirm" type="password" label={t('auth.confirmPassword')}
              placeholder={t('auth.reenterPassword')} required
              leftAddon={<Lock className="w-4 h-4" />}
              error={errors.password_confirm?.message}
              {...register('password_confirm')}
            />

            <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-2">
              {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500 font-body">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
