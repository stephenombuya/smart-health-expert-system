/**
 * SHES API Services
 * One function per endpoint. All functions return typed data directly
 * (unwrapped from the Axios response).
 */
import api from './client'
import type {
  AuthTokens, User, PatientProfile,
  LoginPayload, RegisterPayload,
  TriageSession, SymptomInput,
  Medication, PatientMedication, InteractionCheckResult,
  GlucoseReading, BloodPressureReading, ChronicSummary,
  MoodEntry, CopingStrategy, MoodSummary,
  LabResult, RawResultItem,
  PaginatedResponse,
} from '@/types'


// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
  sendMessage: async (message: string): Promise<{
    message: string
    sources: string[]
  }> => {
    const { data } = await api.post('/chat/', { message })
    return data
  },

  getHistory: async (): Promise<Array<{
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }>> => {
    const { data } = await api.get('/chat/history/')
    return data.messages
  },

  clearHistory: async (): Promise<void> => {
    await api.delete('/chat/history/')
  },
}


// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/login/', payload)
    return data
  },

  googleSignIn: async (idToken: string): Promise<{
    access:   string
    refresh:  string
    created:  boolean
    message:  string
    user: {
      id:            string
      email:         string
      first_name:    string
      last_name:     string
      role:          string
      auth_provider: string
    }
  }> => {
    const { data } = await api.post('/auth/google/', { id_token: idToken })
    return data
  },

  register: async (payload: RegisterPayload) => {
    const { data } = await api.post('/auth/register/', payload)
    return data
  },

  logout: async (refresh: string): Promise<void> => {
    await api.post('/auth/logout/', { refresh })
  },

  getProfile: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/profile/')
    return data
  },

  updateProfile: async (payload: Partial<User>): Promise<User> => {
    const { data } = await api.patch<User>('/auth/profile/', payload)
    return data
  },

  uploadProfilePhoto: async (file: File): Promise<User> => {
    const formData = new FormData()
    formData.append('profile_photo', file)
    const { data } = await api.patch<User>('/auth/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  getPatientProfile: async (): Promise<PatientProfile> => {
    const { data } = await api.get<PatientProfile>('/auth/patient-profile/')
    return data
  },

  updatePatientProfile: async (payload: Partial<PatientProfile>): Promise<PatientProfile> => {
    const { data } = await api.patch<PatientProfile>('/auth/patient-profile/', payload)
    return data
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.put('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },
  /** Step 1: request a password reset link via email */
  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post('/auth/password-reset/', { email })
  },

  /** Step 2: submit token + new password to complete the reset */
  confirmPasswordReset: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/password-reset/confirm/', {
      token,
      new_password: newPassword,
    })
  },

  /** Verify email address using the token from the verification link */
  verifyEmail: async (token: string): Promise<void> => {
    await api.post('/auth/verify-email/', { token })
  },

  /** Resend the verification email for the currently authenticated user */
  resendVerificationEmail: async (): Promise<void> => {
    await api.post('/auth/resend-verification/')
  },

  getNotifications: async (): Promise<{ unread_count: number; results: any[] }> => {
    const { data } = await api.get('/auth/notifications/')
    return data
  },

  markNotificationsRead: async (): Promise<void> => {
    await api.post('/auth/notifications/mark-read/')
  },

  getDoctorPatients: async (): Promise<{ results: any[] }> => {
    const { data } = await api.get('/auth/doctor/patients/')
    return data
  },

  getDoctorPatientSummary: async (patientId: string): Promise<any> => {
    const { data } = await api.get(`/auth/doctor/patients/${patientId}/summary/`)
    return data
  },

  exportHealthSummaryPdf: async (): Promise<void> => {
    const response = await api.get('/auth/export/pdf/', { responseType: 'blob' })
    const url  = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', 'SHES_Health_Summary.pdf')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  getHealthGoal: async () => {
    const { data } = await api.get('/chronic/goal/')
    return data
  },

  updateHealthGoal: async (payload: any) => {
    const { data } = await api.patch('/chronic/goal/', payload)
    return data
  },

  logStrategyEngagement: async (strategyId: number, rating?: number) => {
    const { data } = await api.post('/mental-health/strategy-engagement/', {
      strategy: strategyId,
      rating,
    })
    return data
  },
}

// ─── Triage ───────────────────────────────────────────────────────────────────

export const triageApi = {
  startSession: async (symptoms: SymptomInput[]): Promise<TriageSession> => {
    const { data } = await api.post<{ success: true; data: TriageSession }>(
      '/triage/start/',
      { symptoms }
    )
    return data.data
  },

  getHistory: async (page = 1): Promise<PaginatedResponse<TriageSession>> => {
    const { data } = await api.get<PaginatedResponse<TriageSession>>(
      `/triage/history/?page=${page}`
    )
    return data
  },

  getSession: async (id: string): Promise<TriageSession> => {
    const { data } = await api.get<TriageSession>(`/triage/${id}/`)
    return data
  },

  extractSymptoms: async (text: string): Promise<Array<{
    name: string
    severity: number
    duration_days: number
    body_location: string
  }>> => {
    const { data } = await api.post('/triage/extract-symptoms/', { text })
    return data.symptoms
  },
}

// ─── Medications ──────────────────────────────────────────────────────────────

export const medicationsApi = {
  list: async (search = ''): Promise<PaginatedResponse<Medication>> => {
    const { data } = await api.get<PaginatedResponse<Medication>>(
      `/medications/list/?search=${search}`
    )
    return data
  },

  getMyMedications: async (): Promise<PaginatedResponse<PatientMedication>> => {
    const { data } = await api.get<PaginatedResponse<PatientMedication>>('/medications/my/')
    return data
  },

  addMedication: async (
    payload: Omit<PatientMedication, 'id' | 'created_at' | 'medication_name'> & { medication_id: number }
  ): Promise<PatientMedication> => {
    const { data } = await api.post<PatientMedication>('/medications/my/', payload)
    return data
  },

  updateMedication: async (id: string, payload: Partial<PatientMedication>): Promise<PatientMedication> => {
    const { data } = await api.patch<PatientMedication>(`/medications/my/${id}/`, payload)
    return data
  },

  deleteMedication: async (id: string): Promise<void> => {
    await api.delete(`/medications/my/${id}/`)
  },

  checkInteractions: async (medicationIds: number[]): Promise<InteractionCheckResult> => {
    const { data } = await api.post<InteractionCheckResult>('/medications/interaction-check/', {
      medication_ids: medicationIds,
    })
    return data
  },
}

// ─── Chronic Tracking ─────────────────────────────────────────────────────────

export const chronicApi = {
  getGlucoseReadings: async (page = 1): Promise<PaginatedResponse<GlucoseReading>> => {
    const { data } = await api.get<PaginatedResponse<GlucoseReading>>(
      `/chronic/glucose/?page=${page}&ordering=-recorded_at`
    )
    return data
  },

  addGlucoseReading: async (
    payload: Omit<GlucoseReading, 'id' | 'interpretation' | 'created_at'>
  ): Promise<GlucoseReading> => {
    const { data } = await api.post<GlucoseReading>('/chronic/glucose/', payload)
    return data
  },

  deleteGlucoseReading: async (id: string): Promise<void> => {
    await api.delete(`/chronic/glucose/${id}/`)
  },

  getBPReadings: async (page = 1): Promise<PaginatedResponse<BloodPressureReading>> => {
    const { data } = await api.get<PaginatedResponse<BloodPressureReading>>(
      `/chronic/blood-pressure/?page=${page}&ordering=-recorded_at`
    )
    return data
  },

  addBPReading: async (
    payload: Omit<BloodPressureReading, 'id' | 'classification' | 'created_at'>
  ): Promise<BloodPressureReading> => {
    const { data } = await api.post<BloodPressureReading>('/chronic/blood-pressure/', payload)
    return data
  },

  deleteBPReading: async (id: string): Promise<void> => {
    await api.delete(`/chronic/blood-pressure/${id}/`)
  },

  getSummary: async (): Promise<ChronicSummary> => {
    const { data } = await api.get<ChronicSummary>('/chronic/summary/')
    return data
  },

  getPredictions: async (): Promise<{
    glucose: any
    blood_pressure: any
  }> => {
    const { data } = await api.get('/chronic/predictions/')
    return data.data
  },

  getRiskSummary: async (): Promise<{
    glucose:        { risk_level: 'LOW' | 'RISING' | 'HIGH' | 'UNKNOWN' }
    blood_pressure: { risk_level: 'LOW' | 'RISING' | 'HIGH' | 'UNKNOWN' }
    mood:           { risk_level: 'LOW' | 'RISING' | 'HIGH' | 'UNKNOWN' }
  }> => {
    const { data } = await api.get('/chronic/risk/')
    return data.data
  },

  getHealthIntelligence: async () => {
    const { data } = await api.get('/chronic/intelligence/')
    return data.data
  },
}

// ─── Mental Health ────────────────────────────────────────────────────────────

export const mentalHealthApi = {
  getMoodHistory: async (page = 1): Promise<PaginatedResponse<MoodEntry>> => {
    const { data } = await api.get<PaginatedResponse<MoodEntry>>(
      `/mental-health/mood/?page=${page}&ordering=-recorded_at`
    )
    return data
  },

  logMood: async (
    payload: Omit<MoodEntry, 'id' | 'mood_category' | 'created_at'>
  ): Promise<{ data: MoodEntry; suggested_strategies: CopingStrategy[] }> => {
    const { data } = await api.post<{
      success: true
      data: MoodEntry
      suggested_strategies: CopingStrategy[]
    }>('/mental-health/mood/', payload)
    return { data: data.data, suggested_strategies: data.suggested_strategies }
  },

  deleteMoodEntry: async (id: string): Promise<void> => {
    await api.delete(`/mental-health/mood/${id}/`)
  },

  getCopingStrategies: async (moodCategory?: string): Promise<PaginatedResponse<CopingStrategy>> => {
    const url = moodCategory
      ? `/mental-health/coping-strategies/?mood_category=${moodCategory}`
      : '/mental-health/coping-strategies/'
    const { data } = await api.get<PaginatedResponse<CopingStrategy>>(url)
    return data
  },

  getMoodSummary: async (): Promise<MoodSummary> => {
    const { data } = await api.get<MoodSummary>('/mental-health/summary/')
    return data
  },
}

// ─── Lab Results ──────────────────────────────────────────────────────────────

export const labApi = {
  getResults: async (page = 1): Promise<PaginatedResponse<LabResult>> => {
    const { data } = await api.get<PaginatedResponse<LabResult>>(
      `/lab/results/?page=${page}`
    )
    return data
  },

  submitResult: async (payload: {
    lab_name: string
    test_date: string
    raw_results: RawResultItem[]
  }): Promise<LabResult> => {
    const { data } = await api.post<{ success: true; data: LabResult }>('/lab/results/', payload)
    return data.data
  },

  deleteResult: async (id: string): Promise<void> => {
    await api.delete(`/lab/results/${id}/`)
  },

  uploadReport: async (file: File): Promise<{
    raw_results: Array<{ test_name: string; value: string; unit: string }>
    interpreted_results: any[]
    overall_summary: string
    tests_found: number
  }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/lab/upload-report/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
}


// ─── Wearables ─────────────────────────────────────────────────────────────────

export const wearableApi = {
  getDashboard: async () => {
    const { data } = await api.get('/wearables/dashboard/')
    return data
  },

  getConnections: async () => {
    const { data } = await api.get('/wearables/connections/')
    return data.results ?? data
  },

  getGoogleFitAuthUrl: async (): Promise<{ auth_url: string }> => {
    const { data } = await api.get('/wearables/google-fit/connect/')
    return data
  },

  sync: async () => {
    const { data } = await api.post('/wearables/sync/')
    return data
  },

  logManual: async (readings: Array<{
    metric:      string
    value:       number
    unit?:       string
    recorded_at: string
  }>) => {
    const { data } = await api.post('/wearables/manual/', {
      readings,
      source: 'manual',
    })
    return data
  },

  disconnect: async (provider: string) => {
    await api.delete(`/wearables/disconnect/${provider}/`)
  },

  getReadings: async (metric?: string) => {
    const params = metric ? `?metric=${metric}` : ''
    const { data } = await api.get(`/wearables/readings/${params}`)
    return data
  },

  getFitbitAuthUrl: async (): Promise<{ auth_url: string }> => {
    const { data } = await api.get('/wearables/fitbit/connect/')
    return data
  },

  importAppleHealth: async (file: File): Promise<{ saved: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/wearables/apple-health/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}


// ─── Health Actions ────────────────────────────────────────────────────────────

export const healthActionApi = {
  getActions: async (): Promise<{
    count: number
    actions: Array<{
      id:          number
      title:       string
      description: string
      category:    string
      priority:    string
      icon:        string
      evidence:    any
      created_at:  string
    }>
  }> => {
    const { data } = await api.get('/auth/actions/')
    return data
  },

  refresh: async () => {
    const { data } = await api.post('/auth/actions/refresh/')
    return data
  },

  complete: async (id: number) => {
    await api.patch(`/auth/actions/${id}/`, { completed: true })
  },

  dismiss: async (id: number) => {
    await api.patch(`/auth/actions/${id}/`, { dismissed: true })
  },
}