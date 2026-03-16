/**
 * SHES Profile Page
 * Edit account info, medical profile, and change password.
 */
import { useState } from 'react'
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

  // ── Account form ──────────────────────────────────────────────────────────
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
    mutationFn: authApi.updateProfile,
    onSuccess: async () => { await refreshUser(); setAccountMsg('Profile updated.'); setAccountErr('') },
    onError: (e) => setAccountErr(extractApiError(e)),
  })

  // ── Password form ─────────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const passwordMutation = useMutation({
    mutationFn: (d: PasswordForm) => authApi.changePassword(d.old_password, d.new_password),
    onSuccess: () => { setPassMsg('Password changed successfully.'); setPassErr(''); passwordForm.reset() },
    onError: (e) => setPassErr(extractApiError(e)),
  })

  // ── Medical profile form ──────────────────────────────────────────────────
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
    mutationFn: authApi.updatePatientProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-profile'] }); setMedMsg('Medical profile updated.'); setMedErr('') },
    onError: (e) => setMedErr(extractApiError(e)),
  })

  if (!user) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your account and health information" />

      {/* User summary card */}
      <Card className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary-800 flex items-center justify-center text-white text-2xl font-bold font-display shrink-0">
          {user.first_name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 font-display">{user.full_name}</p>
          <p className="text-sm text-gray-500 font-body">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="primary" className="capitalize">{user.role}</Badge>
            {user.county && <Badge variant="default">{user.county}</Badge>}
          </div>
        </div>
      </Card>

      {/* Account info */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900 font-display">Account Information</h2>
        </div>
        {accountErr && <div className="mb-4"><ErrorMessage message={accountErr} /></div>}
        {accountMsg && <div className="mb-4"><SuccessMessage message={accountMsg} /></div>}

        <form onSubmit={accountForm.handleSubmit((d) => accountMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="first_name" label="First name" required
              error={accountForm.formState.errors.first_name?.message}
              {...accountForm.register('first_name')} />
            <Input id="last_name" label="Last name" required
              error={accountForm.formState.errors.last_name?.message}
              {...accountForm.register('last_name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="phone_number" label="Phone number" placeholder="+254…"
              {...accountForm.register('phone_number')} />
            <Input id="date_of_birth" type="date" label="Date of birth"
              {...accountForm.register('date_of_birth')} />
          </div>
          <Input id="county" label="County" placeholder="e.g. Nairobi"
            {...accountForm.register('county')} />

          <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}
            loading={accountMutation.isPending}>
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Medical profile (patients only) */}
      {user.role === 'patient' && !profileLoading && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-4 h-4 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900 font-display">Medical Profile</h2>
          </div>
          {medErr && <div className="mb-4"><ErrorMessage message={medErr} /></div>}
          {medMsg && <div className="mb-4"><SuccessMessage message={medMsg} /></div>}

          <form onSubmit={medForm.handleSubmit((d) => medMutation.mutate(d))} className="space-y-4">
            <Select id="blood_group" label="Blood group"
              placeholder="Select blood group"
              options={BLOOD_GROUPS} {...medForm.register('blood_group')} />
            <Textarea id="known_allergies" label="Known allergies (optional)"
              placeholder="Penicillin, peanuts…" rows={2}
              {...medForm.register('known_allergies')} />
            <Textarea id="chronic_conditions" label="Chronic conditions (optional)"
              placeholder="Hypertension, Type 2 Diabetes…" rows={2}
              {...medForm.register('chronic_conditions')} />
            <div className="grid grid-cols-2 gap-3">
              <Input id="emergency_contact_name" label="Emergency contact name"
                {...medForm.register('emergency_contact_name')} />
              <Input id="emergency_contact_phone" label="Emergency contact phone"
                {...medForm.register('emergency_contact_phone')} />
            </div>
            <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}
              loading={medMutation.isPending}>
              Save Medical Profile
            </Button>
          </form>
        </Card>
      )}

      {/* Change password */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900 font-display">Change Password</h2>
        </div>
        {passErr && <div className="mb-4"><ErrorMessage message={passErr} /></div>}
        {passMsg && <div className="mb-4"><SuccessMessage message={passMsg} /></div>}

        <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))} className="space-y-4">
          <Input id="old_password" type="password" label="Current password" required
            error={passwordForm.formState.errors.old_password?.message}
            {...passwordForm.register('old_password')} />
          <Input id="new_password" type="password" label="New password" required
            helper="At least 10 characters"
            error={passwordForm.formState.errors.new_password?.message}
            {...passwordForm.register('new_password')} />
          <Button type="submit" size="sm" variant="secondary" leftIcon={<Lock className="w-4 h-4" />}
            loading={passwordMutation.isPending}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  )
}
