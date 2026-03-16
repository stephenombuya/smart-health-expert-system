/**
 * SHES Tests – Utility Functions
 */
import { describe, it, expect } from 'vitest'
import {
  cn, formatDate, formatRelative,
  URGENCY_LABELS, URGENCY_COLORS, URGENCY_DOT,
  getMoodCategory, MOOD_EMOJI, MOOD_LABELS,
  extractApiError, computeMoodTrend, FREQUENCY_LABELS,
  LAB_STATUS_COLORS,
} from '@/utils'
import type { MoodEntry } from '@/types'

// ─── cn ───────────────────────────────────────────────────────────────────────
describe('cn()', () => {
  it('joins class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('ignores falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
  it('handles conditional objects', () => {
    expect(cn({ active: true, inactive: false })).toBe('active')
  })
  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

// ─── formatDate ───────────────────────────────────────────────────────────────
describe('formatDate()', () => {
  it('formats ISO date correctly', () => {
    const result = formatDate('2024-06-15T10:00:00Z')
    expect(result).toMatch(/15 Jun 2024/)
  })
  it('returns original string on invalid input', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

// ─── getMoodCategory ──────────────────────────────────────────────────────────
describe('getMoodCategory()', () => {
  const cases: Array<[number, string]> = [
    [10, 'excellent'], [9, 'excellent'],
    [8,  'good'],      [7, 'good'],
    [6,  'neutral'],   [5, 'neutral'],
    [4,  'low'],       [3, 'low'],
    [2,  'distressed'],[1, 'distressed'],
  ]
  it.each(cases)('score %i → %s', (score, expected) => {
    expect(getMoodCategory(score)).toBe(expected)
  })
})

// ─── URGENCY_LABELS ───────────────────────────────────────────────────────────
describe('URGENCY_LABELS', () => {
  it('covers all four urgency levels', () => {
    expect(Object.keys(URGENCY_LABELS)).toHaveLength(4)
  })
  it('emergency label is descriptive', () => {
    expect(URGENCY_LABELS.emergency.toLowerCase()).toContain('emergency')
  })
})

// ─── extractApiError ──────────────────────────────────────────────────────────
describe('extractApiError()', () => {
  it('returns fallback for null', () => {
    expect(extractApiError(null)).toBe('An unexpected error occurred.')
  })
  it('extracts string detail', () => {
    const err = { response: { data: { error: { detail: 'Invalid credentials.' } } } }
    expect(extractApiError(err)).toBe('Invalid credentials.')
  })
  it('extracts field-level DRF errors', () => {
    const err = { response: { data: { error: { detail: { email: ['This field is required.'] } } } } }
    const result = extractApiError(err)
    expect(result).toContain('email')
    expect(result).toContain('This field is required.')
  })
  it('handles missing response gracefully', () => {
    expect(extractApiError({ message: 'Network Error' })).toBe('An unexpected error occurred.')
  })
})

// ─── computeMoodTrend ─────────────────────────────────────────────────────────
describe('computeMoodTrend()', () => {
  const makeEntry = (score: number, days: number): MoodEntry => ({
    id: String(score),
    mood_score: score,
    mood_category: getMoodCategory(score),
    emotions: [],
    journal_note: '',
    triggers: '',
    recorded_at: new Date(Date.now() - days * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  })

  it('returns entries in chronological order (oldest first)', () => {
    const entries = [makeEntry(8, 2), makeEntry(5, 5), makeEntry(9, 1)]
    const trend = computeMoodTrend(entries)
    expect(trend[0].score).toBe(5) // oldest
    expect(trend[trend.length - 1].score).toBe(9) // newest
  })

  it('limits to 14 entries', () => {
    const entries = Array.from({ length: 20 }, (_, i) => makeEntry(7, i))
    expect(computeMoodTrend(entries).length).toBeLessThanOrEqual(14)
  })

  it('returns empty array for no entries', () => {
    expect(computeMoodTrend([])).toEqual([])
  })
})

// ─── FREQUENCY_LABELS ─────────────────────────────────────────────────────────
describe('FREQUENCY_LABELS', () => {
  it('has readable labels for all frequencies', () => {
    expect(FREQUENCY_LABELS['once_daily']).toBe('Once Daily')
    expect(FREQUENCY_LABELS['twice_daily']).toBe('Twice Daily')
    expect(FREQUENCY_LABELS['as_needed']).toBe('As Needed')
  })
})

// ─── LAB_STATUS_COLORS ────────────────────────────────────────────────────────
describe('LAB_STATUS_COLORS', () => {
  it('has colour for every status', () => {
    const statuses = ['low', 'normal', 'high', 'elevated', 'unknown', 'parse_error']
    statuses.forEach((s) => {
      expect(LAB_STATUS_COLORS[s as never]).toBeTruthy()
    })
  })
})

// ─── MOOD_EMOJI coverage ──────────────────────────────────────────────────────
describe('MOOD_EMOJI', () => {
  it('has an emoji for every category', () => {
    (['excellent','good','neutral','low','distressed'] as const).forEach((c) => {
      expect(MOOD_EMOJI[c]).toBeTruthy()
    })
  })
})
