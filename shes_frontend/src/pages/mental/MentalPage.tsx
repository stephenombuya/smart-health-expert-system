/**
 * SHES Mental Health Page
 * Mood logging, trend chart, coping strategies.
 */
import { useState } from 'react'
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
  const [addOpen, setAddOpen]   = useState(false)
  const [strategies, setStrategies] = useState<CopingStrategy[]>([])
  const [moodPage, setMoodPage]       = useState(1)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  
  const { data: moodHistory, isLoading } = useQuery({
  queryKey: ['mood', moodPage], queryFn: () => mentalHealthApi.getMoodHistory(moodPage),
  })

  const { data: summary } = useQuery({
    queryKey: ['mood-summary'], queryFn: mentalHealthApi.getMoodSummary,
  })

  const { data: allStrategies } = useQuery({
    queryKey: ['coping-strategies'], queryFn: () => mentalHealthApi.getCopingStrategies(),
  })

  const qc = useQueryClient()

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
      <PageHeader
        title="Mental Health"
        subtitle="Track your mood and access evidence-based coping strategies"
        action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Log Mood</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Avg Mood" value={summary?.average_mood_score?.toFixed(1) ?? '—'} unit="/ 10" subtitle="Last 14 days" />
        <StatCard label="Entries" value={summary?.entry_count ?? 0} subtitle="Last 14 days" />
        <StatCard label="Wellbeing" value={summary?.wellbeing_concern ? '⚠ Alert' : '✓ Good'} subtitle={summary?.wellbeing_concern ? 'Low mood detected' : 'Tracking well'} />
      </div>

      {/* Trend chart */}
      {trendData.length > 1 && (
        <Card>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-4">Mood Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[1, 10]} ticks={[1,3,5,7,9,10]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} / 10`, 'Mood']} />
              <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Low', position: 'right', fontSize: 10 }} />
              <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* History */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 font-display uppercase tracking-wide">Recent Entries</h2>
          {isLoading ? <PageLoader /> : !moodHistory?.results.length ? (
            <EmptyState icon={<Brain className="w-8 h-8" />} title="No mood entries yet"
              action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Your Mood</Button>} />
          ) : (
            moodHistory.results.map((entry) => (
              <Card key={entry.id} padding="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{MOOD_EMOJI[entry.mood_category]}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-lg font-bold text-gray-900 font-display">{entry.mood_score}</span>
                        <MoodBadge category={entry.mood_category} />
                        <span className="text-xs text-gray-400 font-body">{formatDateTime(entry.recorded_at)}</span>
                      </div>
                      {entry.emotions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.emotions.map((e) => (
                            <span key={e} className="px-2 py-0.5 bg-surface-100 rounded-full text-xs text-gray-500 font-body">{e}</span>
                          ))}
                        </div>
                      )}
                      {entry.journal_note && (
                        <p className="text-xs text-gray-500 font-body mt-1 italic">"{entry.journal_note.slice(0, 80)}…"</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setDeleteId(entry.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg shrink-0" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
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

        {/* Coping strategies */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 font-display uppercase tracking-wide">Coping Strategies</h2>
          {strategies.length > 0 && (
            <Card className="border border-primary-200 bg-primary-50">
              <p className="text-xs font-semibold text-primary-800 font-display mb-2">Suggested for you</p>
              <div className="space-y-2">
                {strategies.map((s) => <StrategyCard key={s.id} strategy={s} />)}
              </div>
            </Card>
          )}
          <div className="space-y-2">
            {(allStrategies?.results ?? []).slice(0, 5).map((s) => <StrategyCard key={s.id} strategy={s} />)}
          </div>
        </div>
      </div>
      
      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
        title="Delete this mood entry?"
        message="This journal entry and mood score will be permanently removed."
      />
      <AddMoodModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={setStrategies} />
    </div>
  )
}
