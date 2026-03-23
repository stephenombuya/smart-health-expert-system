/**
 * SHES Mental Health Page
 * Mood logging, trend chart, coping strategies.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Brain, Clock, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { mentalHealthApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/Input'
import { Card, PageHeader, StatCard, MoodBadge, Modal, EmptyState, PageLoader, ErrorMessage } from '@/components/common'
import { extractApiError, formatDate, formatDateTime, getMoodCategory, MOOD_EMOJI, computeMoodTrend } from '@/utils'
import type { CopingStrategy } from '@/types'
import { sanitiseSubmission } from '@/utils/sanitise'
import { Pagination } from '@/components/common/Pagination'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'
import { authApi } from '@/api/services'
import { CheckCircle2 } from 'lucide-react'

// ─── Mood form ────────────────────────────────────────────────────────────────
const schema = z.object({
  mood_score:   z.coerce.number().min(1).max(10),
  emotions:     z.string().optional(),
  journal_note: z.string().optional(),
  triggers:     z.string().optional(),
  recorded_at:  z.string().min(1, 'Required'),
})
type MoodForm = z.infer<typeof schema>

const EMOTION_TAGS = ['anxious','tired','happy','hopeful','sad','calm','stressed','grateful','frustrated','content','overwhelmed','motivated']

function StrategyCard({ strategy }: { strategy: CopingStrategy }) {
  const [expanded, setExpanded] = useState(false)
  const [done, setDone]   = useState(false)
  const [rating, setRating] = useState<number | null>(null)

  const engage = useMutation({
    mutationFn: () => authApi.logStrategyEngagement(strategy.id, rating ?? undefined),
    onSuccess: () => setDone(true),
  })

  return (
    <Card padding="sm" hover onClick={() => setExpanded((e) => !e)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 font-display">{strategy.title}</p>
          <p className="text-xs text-gray-500 font-body capitalize">{strategy.strategy_type.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {strategy.duration_minutes && (
            <span className="flex items-center gap-1 text-xs text-gray-400 font-body">
              <Clock className="w-3 h-3" />{strategy.duration_minutes}m
            </span>
          )}
          <span className="text-xs text-primary-600">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-fade-in">
          <p className="text-xs text-gray-600 font-body">{strategy.description}</p>
          <div className="bg-primary-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-primary-800 font-display mb-1">Instructions</p>
            <p className="text-xs text-primary-700 font-body whitespace-pre-line">{strategy.instructions}</p>
          </div>
        </div>
      )}
      {expanded && !done && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <p className="text-xs text-gray-500 font-body">Rate effectiveness:</p>
          {[1,2,3,4,5].map(r => (
            <button key={r} onClick={() => setRating(r)}
              className={`text-sm ${rating && rating >= r ? 'text-amber-400' : 'text-gray-300'}`}>
              ★
            </button>
          ))}
          <Button size="sm" variant="secondary" className="ml-auto"
            loading={engage.isPending}
            onClick={() => engage.mutate()}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Done
          </Button>
        </div>
      )}
      {done && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-xs text-emerald-600 font-body">Marked as completed!</p>
        </div>
      )}
    </Card>
  )
}

function AddMoodModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (strategies: CopingStrategy[]) => void }) {
  const [apiError, setApiError] = useState('')
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [score, setScore] = useState(7)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<MoodForm>({ resolver: zodResolver(schema), defaultValues: { mood_score: 7 } })

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (d: MoodForm) => mentalHealthApi.logMood(sanitiseSubmission({
      mood_score: d.mood_score,
      emotions: selectedEmotions,
      journal_note: d.journal_note ?? '',
      triggers: d.triggers ?? '',
      recorded_at: d.recorded_at,
    })),
    onSuccess: ({ suggested_strategies }) => {
      qc.invalidateQueries({ queryKey: ['mood'] })
      qc.invalidateQueries({ queryKey: ['mood-summary'] })
      reset()
      setSelectedEmotions([])
      setScore(7)
      onSuccess(suggested_strategies)
      onClose()
    },
    onError: (e) => setApiError(extractApiError(e)),
  })

  const category = getMoodCategory(score)

  return (
    <Modal open={open} onClose={onClose} title="Log Today's Mood" maxWidth="md">
      {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        {/* Score slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 font-display">Mood Score *</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{MOOD_EMOJI[category]}</span>
              <span className="text-2xl font-bold text-primary-800 font-display">{score}</span>
              <MoodBadge category={category} />
            </div>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            {...register('mood_score', { onChange: (e) => setScore(Number(e.target.value)) })}
            style={{ '--val': `${(score - 1) / 9 * 100}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-gray-400 font-body mt-1">
            <span>1 – Distressed</span><span>10 – Excellent</span>
          </div>
          {errors.mood_score && <p className="text-xs text-red-600 mt-1">⚠ {errors.mood_score.message}</p>}
        </div>

        {/* Emotion tags */}
        <div>
          <p className="text-sm font-medium text-gray-700 font-display mb-2">How are you feeling?</p>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map((e) => (
              <button key={e} type="button"
                onClick={() => setSelectedEmotions((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 font-body ${
                  selectedEmotions.includes(e) ? 'bg-primary-800 text-white' : 'bg-surface-100 text-gray-600 hover:bg-primary-50'
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <Input id="recorded_at" type="datetime-local" label="Date & Time" required
          error={errors.recorded_at?.message} {...register('recorded_at')} />

        <Textarea id="journal_note" label="Journal note (optional)"
          placeholder="How was your day? What's on your mind?"
          rows={3} {...register('journal_note')} />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={isSubmitting}>Save Entry</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function MentalPage() {
  const [tab, setTab] = useState<'log' | 'history' | 'strategies'>('history')
  const [addOpen, setAddOpen] = useState(false)
  const [strategies, setStrategies] = useState<CopingStrategy[]>([])
  const [moodPage, setMoodPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: moodHistory, isLoading } = useQuery({
    queryKey: ['mood', moodPage],
    queryFn: () => mentalHealthApi.getMoodHistory(moodPage),
  })

  const { data: summary } = useQuery({
    queryKey: ['mood-summary'],
    queryFn: mentalHealthApi.getMoodSummary,
  })

  const { data: allStrategies } = useQuery({
    queryKey: ['coping-strategies'],
    queryFn: () => mentalHealthApi.getCopingStrategies(),
  })

  const deleteMutation = useMutation({
    mutationFn: mentalHealthApi.deleteMoodEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mood'] })
      qc.invalidateQueries({ queryKey: ['mood-summary'] })
      setDeleteId(null)
    },
  })

  const trendData = computeMoodTrend(moodHistory?.results ?? [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <PageHeader
        title={t('mental.title')}
        subtitle={t('mental.subtitle')}
        action={
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddOpen(true)}
          >
            {t('mental.logMood')}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit">
        {[
          ['log', t('mental.logMood')],
          ['history', t('mental.moodHistory')],
          ['strategies', t('mental.copingStrategies')],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === key
                ? 'bg-white shadow-sm text-primary-800'
                : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label={t('mental.moodScore')}
          value={summary?.average_mood_score?.toFixed(1) ?? '—'}
          unit="/ 10"
          subtitle="14 days"
        />
        <StatCard
          label="Entries"
          value={summary?.entry_count ?? 0}
          subtitle="14 days"
        />
        <StatCard
          label={t('mental.wellbeingAlert')}
          value={summary?.wellbeing_concern ? '⚠' : '✓'}
          subtitle={
            summary?.wellbeing_concern
              ? t('mental.wellbeingMsg')
              : 'OK'
          }
        />
      </div>

      {/* Trend */}
      {trendData.length > 1 && (
        <Card>
          <p className="text-xs font-semibold text-gray-400 mb-4">
            {t('mental.moodTrend')}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 10]} />
              <Tooltip />
              <ReferenceLine y={4} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="score" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-3">
          {isLoading ? (
            <PageLoader />
          ) : !moodHistory?.results.length ? (
            <EmptyState
              icon={<Brain className="w-8 h-8" />}
              title={t('mental.noMoodHistory')}
              message={t('mental.logFirstMood')}
              action={
                <Button onClick={() => setAddOpen(true)}>
                  {t('mental.logMood')}
                </Button>
              }
            />
          ) : (
            moodHistory.results.map((entry) => (
              <Card key={entry.id} padding="sm">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">{entry.mood_score}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(entry.recorded_at)}
                    </p>
                  </div>
                  <button onClick={() => setDeleteId(entry.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </Card>
            ))
          )}

          <Pagination
            count={moodHistory?.count ?? 0}
            currentPage={moodPage}
            onPageChange={setMoodPage}
          />
        </div>
      )}

      {/* STRATEGIES TAB */}
      {tab === 'strategies' && (
        <div className="space-y-2">
          {(allStrategies?.results ?? []).map((s) => (
            <StrategyCard key={s.id} strategy={s} />
          ))}
        </div>
      )}

      {/* DELETE MODAL */}
      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('mental.deleteConfirmTitle')}
        message={t('mental.deleteConfirmMessage')}
      />

      <AddMoodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={setStrategies}
      />
    </div>
  )
}

