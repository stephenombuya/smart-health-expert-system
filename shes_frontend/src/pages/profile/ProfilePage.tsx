/**
 * SHES Profile Page
 * Edit account info, medical profile, and change password.
 */
import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Heart, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input, Select, Textarea } from '@/components/common/Input'
import { Card, PageHeader, Badge, ErrorMessage, SuccessMessage, PageLoader } from '@/components/common'
import { extractApiError } from '@/utils'
import { sanitiseSubmission } from '@/utils/sanitise'
import { Upload, Download, Camera } from 'lucide-react'




// ─── Account form schema ──────────────────────────────────────────────────────
const accountSchema = z.object({
  first_name:   z.string().min(2),
  last_name:    z.string().min(2),
  phone_number: z.string().optional(),
  county:       z.string().optional(),
  date_of_birth:z.string().optional(),
})
type AccountForm = z.infer<typeof accountSchema>

// ─── Password form schema ─────────────────────────────────────────────────────
const passwordSchema = z.object({
  old_password: z.string().min(1, 'Enter your current password'),
  new_password: z.string().min(10, 'At least 10 characters'),
}).refine((d) => d.old_password !== d.new_password, {
  message: 'New password must differ from current',
  path: ['new_password'],
})
type PasswordForm = z.infer<typeof passwordSchema>

// ─── Medical profile schema ───────────────────────────────────────────────────
const medSchema = z.object({
  blood_group:            z.string().optional(),
  known_allergies:        z.string().optional(),
  chronic_conditions:     z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone:z.string().optional(),
})
type MedForm = z.infer<typeof medSchema>

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'].map((v) => ({ value: v, label: v }))

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [accountMsg, setAccountMsg] = useState('')
  const [passMsg, setPassMsg]       = useState('')
  const [medMsg, setMedMsg]         = useState('')
  const [accountErr, setAccountErr] = useState('')
  const [passErr, setPassErr]       = useState('')
  const [medErr, setMedErr]         = useState('')

  const { data: patientProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: authApi.getPatientProfile,
    enabled: user?.role === 'patient',
  })

  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    values: {
      first_name:    user?.first_name ?? '',
      last_name:     user?.last_name ?? '',
      phone_number:  user?.phone_number ?? '',
      county:        user?.county ?? '',
      date_of_birth: user?.date_of_birth ?? '',
    },
  })

  const accountMutation = useMutation({
    mutationFn: (d: AccountForm) => authApi.updateProfile(sanitiseSubmission(d)),
    onSuccess: async () => { 
      await refreshUser()
      setAccountMsg(t('profile.saving'))
      setAccountErr('')
    },
    onError: (e) => setAccountErr(extractApiError(e)),
  })

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })
  const passwordMutation = useMutation({
    mutationFn: (d: PasswordForm) => authApi.changePassword(d.old_password, d.new_password),
    onSuccess: () => { 
      setPassMsg(t('profile.saving'))
      setPassErr('')
      passwordForm.reset() 
    },
    onError: (e) => setPassErr(extractApiError(e)),
  })

  const medForm = useForm<MedForm>({
    resolver: zodResolver(medSchema),
    values: {
      blood_group:             patientProfile?.blood_group ?? '',
      known_allergies:         patientProfile?.known_allergies ?? '',
      chronic_conditions:      patientProfile?.chronic_conditions ?? '',
      emergency_contact_name:  patientProfile?.emergency_contact_name ?? '',
      emergency_contact_phone: patientProfile?.emergency_contact_phone ?? '',
    },
  })
  const medMutation = useMutation({
    mutationFn: (d: MedForm) => authApi.updatePatientProfile(sanitiseSubmission(d)),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['patient-profile'] })
      setMedMsg(t('profile.saving'))
      setMedErr('')
    },
    onError: (e) => setMedErr(extractApiError(e)),
  })

  if (!user) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader 
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      {/* User summary card */}
      <Card className="flex items-center gap-5">
        <div className="relative shrink-0">
          {user.profile_photo ? (
            <img
              src={user.profile_photo}
              alt={user.full_name}
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary-800 flex items-center justify-center text-white text-2xl font-bold font-display">
              {user.first_name[0]?.toUpperCase()}
            </div>
          )}
          <label
            htmlFor="photo-upload"
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-gray-200 shadow flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
            title={t('profile.photoHint')}
          >
            <Camera className="w-3 h-3 text-gray-600" />
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 2 * 1024 * 1024) {
                alert(t('profile.photoHint'))
                return
              }
              try {
                await authApi.uploadProfilePhoto(file)
                await refreshUser()
              } catch {
                alert(t('profile.photoHint'))
              }
            }}
          />
        </div>

        <div>
          <p className="text-xl font-bold text-gray-900 font-display">{user.full_name}</p>
          <p className="text-sm text-gray-500 font-body">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="primary" className="capitalize">{user.role}</Badge>
            {user.county && <Badge variant="default">{user.county}</Badge>}
          </div>
          <p className="text-xs text-gray-400 font-body mt-1">
            {t('profile.memberSince')}: {user.created_at && new Date(user.created_at).toLocaleDateString()}
          </p>
          <Badge variant={user.is_email_verified ? 'success' : 'warning'}>
            {user.is_email_verified ? t('profile.verifiedBadge') : t('profile.unverifiedBadge')}
          </Badge>
        </div>
      </Card>

      {/* PDF Export */}
      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 font-display">{t('profile.downloadPdf')}</p>
          <p className="text-xs text-gray-400 font-body mt-0.5">{t('profile.downloadPdfSubtitle')}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={async () => {
            try {
              await authApi.exportHealthSummaryPdf()
            } catch {
              alert(t('profile.downloadPdfSubtitle'))
            }
          }}
        >
          {t('profile.downloadButton')}
        </Button>
      </Card>

      {/* Account info */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900 font-display">{t('profile.accountInfo')}</h2>
        </div>
        {accountErr && <div className="mb-4"><ErrorMessage message={accountErr} /></div>}
        {accountMsg && <div className="mb-4"><SuccessMessage message={accountMsg} /></div>}

        <form onSubmit={accountForm.handleSubmit((d) => accountMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="first_name" label={t('profile.firstName')} required
              error={accountForm.formState.errors.first_name?.message}
              {...accountForm.register('first_name')} />
            <Input id="last_name" label={t('profile.lastName')} required
              error={accountForm.formState.errors.last_name?.message}
              {...accountForm.register('last_name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="phone_number" label={t('profile.phone')} placeholder="+254…"
              {...accountForm.register('phone_number')} />
            <Input id="date_of_birth" type="date" label={t('profile.dob')}
              {...accountForm.register('date_of_birth')} />
          </div>
          <Input id="county" label={t('profile.county')} placeholder="e.g. Nairobi"
            {...accountForm.register('county')} />

          <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}
            loading={accountMutation.isPending}>
            {accountMutation.isPending ? t('profile.saving') : t('common.save')}
          </Button>
        </form>
      </Card>

      {/* Medical profile */}
      {user.role === 'patient' && !profileLoading && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-4 h-4 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900 font-display">{t('profile.medicalProfile')}</h2>
          </div>
          {medErr && <div className="mb-4"><ErrorMessage message={medErr} /></div>}
          {medMsg && <div className="mb-4"><SuccessMessage message={medMsg} /></div>}

          <form onSubmit={medForm.handleSubmit((d) => medMutation.mutate(d))} className="space-y-4">
            <Select id="blood_group" label={t('profile.bloodGroup')}
              placeholder={t('profile.bloodGroup')}
              options={BLOOD_GROUPS} {...medForm.register('blood_group')} />
            <Textarea id="known_allergies" label={t('profile.knownAllergies')}
              placeholder={t('profile.knownAllergies')} rows={2}
              {...medForm.register('known_allergies')} />
            <Textarea id="chronic_conditions" label={t('profile.chronicConditions')}
              placeholder={t('profile.chronicConditions')} rows={2}
              {...medForm.register('chronic_conditions')} />
            <div className="grid grid-cols-2 gap-3">
              <Input id="emergency_contact_name" label={t('profile.emergencyContact')}
                {...medForm.register('emergency_contact_name')} />
              <Input id="emergency_contact_phone" label={t('profile.emergencyPhone')}
                {...medForm.register('emergency_contact_phone')} />
            </div>
            <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}
              loading={medMutation.isPending}>
              {medMutation.isPending ? t('profile.saving') : t('common.save')}
            </Button>
          </form>
        </Card>
      )}

      {/* Change password */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900 font-display">{t('profile.changePassword')}</h2>
        </div>
        {passErr && <div className="mb-4"><ErrorMessage message={passErr} /></div>}
        {passMsg && <div className="mb-4"><SuccessMessage message={passMsg} /></div>}

        <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))} className="space-y-4">
          <Input id="old_password" type="password" label={t('profile.currentPassword')} required
            error={passwordForm.formState.errors.old_password?.message}
            {...passwordForm.register('old_password')} />
          <Input id="new_password" type="password" label={t('profile.newPassword')} required
            helper={t('profile.newPassword')}
            error={passwordForm.formState.errors.new_password?.message}
            {...passwordForm.register('new_password')} />
          <Button type="submit" size="sm" variant="secondary" leftIcon={<Lock className="w-4 h-4" />}
            loading={passwordMutation.isPending}>
            {passwordMutation.isPending ? t('profile.saving') : t('common.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}

