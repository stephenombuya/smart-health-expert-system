/**
 * SHES Utility Functions
 */
import { clsx, type ClassValue } from 'clsx'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { UrgencyLevel, MoodCategory, InteractionSeverity, LabResultStatus, MoodEntry } from '@/types'

// ─── Class name helper ────────────────────────────────────────────────────────

/** Merge Tailwind classes conditionally (wraps clsx) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy') } catch { return iso }
}

export function formatDateTime(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy, HH:mm') } catch { return iso }
}

export function formatRelative(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }) } catch { return iso }
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  emergency:    'Emergency',
  doctor_visit: 'Doctor Visit',
  self_care:    'Self-Care',
  undetermined: 'Undetermined',
}

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  emergency:    'bg-red-100 text-red-800 border-red-200',
  doctor_visit: 'bg-amber-100 text-amber-800 border-amber-200',
  self_care:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  undetermined: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const URGENCY_DOT: Record<UrgencyLevel, string> = {
  emergency:    'bg-red-500',
  doctor_visit: 'bg-amber-500',
  self_care:    'bg-emerald-500',
  undetermined: 'bg-gray-400',
}

export const URGENCY_ICON: Record<UrgencyLevel, string> = {
  emergency:    '🚨',
  doctor_visit: '🩺',
  self_care:    '🏠',
  undetermined: '⚠️',
}

// ─── Mood helpers ─────────────────────────────────────────────────────────────

export const MOOD_LABELS: Record<MoodCategory, string> = {
  excellent:  'Excellent',
  good:       'Good',
  neutral:    'Neutral',
  low:        'Low',
  distressed: 'Distressed',
}

export const MOOD_COLORS: Record<MoodCategory, string> = {
  excellent:  'bg-emerald-100 text-emerald-800',
  good:       'bg-teal-100 text-teal-800',
  neutral:    'bg-blue-100 text-blue-700',
  low:        'bg-amber-100 text-amber-800',
  distressed: 'bg-red-100 text-red-800',
}

export const MOOD_EMOJI: Record<MoodCategory, string> = {
  excellent:  '😄',
  good:       '🙂',
  neutral:    '😐',
  low:        '😔',
  distressed: '😢',
}

export function getMoodCategory(score: number): MoodCategory {
  if (score >= 9) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'neutral'
  if (score >= 3) return 'low'
  return 'distressed'
}

// ─── Drug interaction helpers ─────────────────────────────────────────────────

export const INTERACTION_COLORS: Record<InteractionSeverity, string> = {
  minor:          'bg-blue-50 text-blue-700 border-blue-200',
  moderate:       'bg-amber-50 text-amber-700 border-amber-200',
  major:          'bg-orange-100 text-orange-800 border-orange-300',
  contraindicated:'bg-red-100 text-red-800 border-red-300',
}

// ─── Lab result helpers ───────────────────────────────────────────────────────

export const LAB_STATUS_COLORS: Record<LabResultStatus, string> = {
  normal:     'text-emerald-700 bg-emerald-50',
  elevated:   'text-amber-700 bg-amber-50',
  low:        'text-blue-700 bg-blue-50',
  high:       'text-red-700 bg-red-50',
  unknown:    'text-gray-600 bg-gray-50',
  parse_error:'text-gray-500 bg-gray-50',
}

// ─── Frequency labels ─────────────────────────────────────────────────────────

export const FREQUENCY_LABELS: Record<string, string> = {
  once_daily:        'Once Daily',
  twice_daily:       'Twice Daily',
  three_times_daily: '3× Daily',
  four_times_daily:  '4× Daily',
  as_needed:         'As Needed',
  weekly:            'Once Weekly',
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

/** Extract a flat error message from a Django REST Framework error response */
export function extractApiError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred.'
  const axiosErr = error as { response?: { data?: { error?: { detail?: unknown } } } }
  const detail = axiosErr?.response?.data?.error?.detail
  if (!detail) return 'An unexpected error occurred.'
  if (typeof detail === 'string') return detail
  if (typeof detail === 'object') {
    const messages = Object.entries(detail as Record<string, string[]>)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join(' | ')
    return messages
  }
  return 'An unexpected error occurred.'
}

/** Compute 7-day mood trend from mood entries */
export function computeMoodTrend(entries: MoodEntry[]): Array<{ date: string; score: number }> {
  return entries
    .slice(0, 14)
    .map((e) => ({
      date: formatDate(e.recorded_at),
      score: e.mood_score,
    }))
    .reverse()
}
