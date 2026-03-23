/**
 * SHES Frontend – Shared TypeScript Types
 * Mirrors the Django backend model structure exactly.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'admin'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  date_of_birth: string | null
  phone_number: string
  county: string
  is_active: boolean
  is_email_verified: boolean 
  profile_photo: string | null 
  created_at: string
}

export interface PatientProfile {
  id: number
  blood_group: string
  known_allergies: string
  chronic_conditions: string
  emergency_contact_name: string
  emergency_contact_phone: string
  updated_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  first_name: string
  last_name: string
  password: string
  password_confirm: string
  role: UserRole
  phone_number?: string
  county?: string
}

// ─── Triage ───────────────────────────────────────────────────────────────────

export type UrgencyLevel = 'emergency' | 'doctor_visit' | 'self_care' | 'undetermined'

export interface SymptomInput {
  name: string
  severity: number          // 1–10
  duration_days?: number
  body_location?: string
  additional_notes?: string
}

export interface SymptomRecord extends SymptomInput {
  id: string
  created_at: string
}

export interface MatchedCondition {
  name: string
  description: string
  urgency: UrgencyLevel
  match_ratio: number
  home_care_tips: string[]
}

export interface TriageSession {
  id: string
  patient_name: string
  urgency_level: UrgencyLevel
  recommendation: string
  layman_explanation: string
  red_flags_detected: string[]
  matched_conditions: MatchedCondition[]
  completed: boolean
  symptoms: SymptomRecord[]
  created_at: string
  updated_at: string
}

// ─── Medications ──────────────────────────────────────────────────────────────

export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'as_needed'
  | 'weekly'

export interface Medication {
  id: number
  name: string
  generic_name: string
  drug_class: string
  common_uses: string
  standard_dosage: string
  contraindications: string
  side_effects: string
  is_keml_listed: boolean
}

export type InteractionSeverity = 'minor' | 'moderate' | 'major' | 'contraindicated'

export interface DrugInteraction {
  id: number
  drug_a_name: string
  drug_b_name: string
  severity: InteractionSeverity
  description: string
  clinical_action: string
}

export interface PatientMedication {
  id: string
  medication_id?: number
  medication_name: string
  dosage: string
  frequency: MedicationFrequency
  start_date: string
  end_date: string | null
  prescribing_doctor: string
  notes: string
  is_active: boolean
  created_at: string
}

export interface InteractionCheckResult {
  success: boolean
  interactions_found: number
  major_warnings: number
  message: string
  data: DrugInteraction[]
}

// ─── Chronic Tracking ─────────────────────────────────────────────────────────

export type GlucoseContext =
  | 'fasting'
  | 'post_meal_1h'
  | 'post_meal_2h'
  | 'random'
  | 'bedtime'

export interface GlucoseReading {
  id: string
  value_mg_dl: number
  context: GlucoseContext
  hba1c: number | null
  notes: string
  recorded_at: string
  interpretation: string
  created_at: string
}

export interface BloodPressureReading {
  id: string
  systolic: number
  diastolic: number
  pulse: number | null
  notes: string
  recorded_at: string
  classification: string
  created_at: string
}

export interface ChronicSummary {
  success: boolean
  period_days: number
  glucose: {
    count: number
    average_mg_dl: number | null
    latest: GlucoseReading | null
  }
  blood_pressure: {
    count: number
    average_systolic: number | null
    average_diastolic: number | null
    latest: BloodPressureReading | null
  }
}

// ─── Mental Health ────────────────────────────────────────────────────────────

export type MoodCategory = 'excellent' | 'good' | 'neutral' | 'low' | 'distressed'

export type StrategyType =
  | 'breathing'
  | 'cognitive'
  | 'physical'
  | 'social'
  | 'mindfulness'
  | 'journaling'
  | 'professional'

export interface MoodEntry {
  id: string
  mood_score: number
  mood_category: MoodCategory
  emotions: string[]
  journal_note: string
  triggers: string
  recorded_at: string
  created_at: string
}

export interface CopingStrategy {
  id: number
  title: string
  strategy_type: StrategyType
  description: string
  instructions: string
  duration_minutes: number | null
}

export interface MoodSummary {
  success: boolean
  period_days: number
  entry_count: number
  average_mood_score: number | null
  wellbeing_concern: boolean
  message: string
  breakdown_by_category: Array<{ mood_category: MoodCategory; count: number }>
}

// ─── Lab Results ──────────────────────────────────────────────────────────────

export type LabResultStatus = 'low' | 'normal' | 'high' | 'elevated' | 'unknown' | 'parse_error'

export interface RawResultItem {
  test_name: string
  value: string
  unit: string
}

export interface InterpretedResultItem {
  test_name: string
  value: number
  unit: string
  status: LabResultStatus
  label: string
  advice: string
}

export interface LabResult {
  id: string
  lab_name: string
  test_date: string
  raw_results: RawResultItem[]
  interpreted_results: InterpretedResultItem[]
  overall_summary: string
  doctor_notes: string
  created_at: string
}

// ─── API Utilities ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: {
    code: number
    detail: Record<string, string[]> | string
  }
}
