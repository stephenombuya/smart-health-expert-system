/**
 * SHES Chronic Tracking Page
 * Blood glucose and blood pressure logging with trend charts.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Global } from 'recharts'
import { chronicApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { Card, PageHeader, StatCard, Badge, Modal, EmptyState, PageLoader, ErrorMessage } from '@/components/common'
import { extractApiError, formatDate, formatDateTime } from '@/utils'
import { sanitiseSubmission } from '@/utils/sanitise'
import { Pagination } from '@/components/common/Pagination'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'
import { Target } from 'lucide-react'
import { authApi } from '@/api/services'


type Tab = 'glucose' | 'bp'

// ─── Glucose form ─────────────────────────────────────────────────────────────
const glucoseSchema = z.object({
  value_mg_dl: z.coerce.number().min(20, 'Min 20').max(800, 'Max 800'),
  context:     z.string().min(1, 'Select context'),
  hba1c:       z.coerce.number().min(3).max(20).optional().or(z.literal('')),
  notes:       z.string().optional(),
  recorded_at: z.string().min(1, 'Select date and time'),
})
type GlucoseForm = z.infer<typeof glucoseSchema>


// ─── BP form ──────────────────────────────────────────────────────────────────
const bpSchema = z.object({
  systolic:    z.coerce.number().min(60).max(300),
  diastolic:   z.coerce.number().min(30).max(200),
  pulse:       z.coerce.number().min(30).max(250).optional().or(z.literal('')),
  notes:       z.string().optional(),
  recorded_at: z.string().min(1, 'Select date and time'),
})
type BPForm = z.infer<typeof bpSchema>

export default function ChronicPage() {
  const [tab, setTab]           = useState<Tab>('glucose')
  const [addGlucose, setAddGlucose] = useState(false)
  const [addBP, setAddBP]       = useState(false)
  const qc = useQueryClient()
  const { t } = useTranslation()
  const GLUCOSE_CONTEXT_OPTIONS = [
    { value: 'fasting', label: t('chronic.fasting') },
    { value: 'post_meal_1h', label: t('chronic.postMeal1h') },
    { value: 'post_meal_2h', label: t('chronic.postMeal2h') },
    { value: 'random', label: t('chronic.random') },
    { value: 'bedtime', label: t('chronic.bedtime') },
  ]
  const [glucosePage, setGlucosePage] = useState(1)
  const [bpPage, setBpPage]           = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'glucose' | 'bp' } | null>(null)

  const { data: goal } = useQuery({
    queryKey: ['health-goal'],
    queryFn:  authApi.getHealthGoal,
  })

  const { data: predictions } = useQuery({
    queryKey: ['health-predictions'],
    queryFn:  chronicApi.getPredictions,
    staleTime: 1000 * 60 * 60, 
  })

  const { data: summary } = useQuery({ queryKey: ['chronic-summary'], queryFn: chronicApi.getSummary })
  const { data: glucoseData, isLoading: gLoading } = useQuery({
    queryKey: ['glucose', glucosePage], queryFn: () => chronicApi.getGlucoseReadings(glucosePage),
  })

  const { data: bpData, isLoading: bpLoading } = useQuery({
    queryKey: ['bp', bpPage], queryFn: () => chronicApi.getBPReadings(bpPage),
  })

  // Glucose chart data (last 14)
  const glucoseChartData = (glucoseData?.results ?? []).slice(0, 14).reverse().map((r) => ({
    date: formatDate(r.recorded_at),
    value: r.value_mg_dl,
  }))

  // BP chart data
  const bpChartData = (bpData?.results ?? []).slice(0, 14).reverse().map((r) => ({
    date: formatDate(r.recorded_at),
    systolic: r.systolic,
    diastolic: r.diastolic,
  }))

  const deleteGlucose = useMutation({
  mutationFn: chronicApi.deleteGlucoseReading,
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['glucose'] }); setDeleteTarget(null) },
  })
  const deleteBP = useMutation({
    mutationFn: chronicApi.deleteBPReading,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp'] }); setDeleteTarget(null) },
  })

  // ── Glucose Add Modal ─────────────────────────────────────────────────────
  function GlucoseModal() {
    const [apiError, setApiError] = useState('')
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
      useForm<GlucoseForm>({ resolver: zodResolver(glucoseSchema) })

    const mutation = useMutation({
      mutationFn: (d: GlucoseForm) => chronicApi.addGlucoseReading(sanitiseSubmission({
        value_mg_dl: d.value_mg_dl, context: d.context as never,
        hba1c: d.hba1c ? Number(d.hba1c) : null,
        notes: d.notes ?? '', recorded_at: d.recorded_at,
      })),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['glucose'] }); qc.invalidateQueries({ queryKey: ['chronic-summary'] }); reset(); setAddGlucose(false) },
      onError: (e) => setApiError(extractApiError(e)),
    })

    return (
      <Modal open={addGlucose} onClose={() => setAddGlucose(false)} title="Log Glucose Reading">
        {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input 
              id="value_mg_dl" 
              type="number" 
              label={t('chronic.value')}
              required 
              placeholder="e.g. 95"
              error={errors.value_mg_dl?.message} 
              {...register('value_mg_dl')} 
            />
            <Select 
              id="context" 
              label={t('chronic.context')}
              required 
              placeholder="When?"
              options={GLUCOSE_CONTEXT_OPTIONS} 
              error={errors.context?.message} 
              {...register('context')} 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input 
              id="hba1c" 
              type="number" 
              step="0.1" 
              label={t('chronic.hba1c')}
              placeholder="e.g. 5.4"
              {...register('hba1c')} 
            />
            <Input 
              id="recorded_at" 
              type="datetime-local" 
              label={t('chronic.recordedAt')}
              required
              error={errors.recorded_at?.message} 
              {...register('recorded_at')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setAddGlucose(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={isSubmitting}>Save Reading</Button>
          </div>
        </form>
      </Modal>
    )
  }

  // ── BP Add Modal ──────────────────────────────────────────────────────────
  function BPModal() {
    const [apiError, setApiError] = useState('')
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
      useForm<BPForm>({ resolver: zodResolver(bpSchema) })

    const mutation = useMutation({
      mutationFn: (d: BPForm) => chronicApi.addBPReading(sanitiseSubmission({
        systolic: d.systolic, diastolic: d.diastolic,
        pulse: d.pulse ? Number(d.pulse) : null,
        notes: d.notes ?? '', recorded_at: d.recorded_at,
      })),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp'] }); qc.invalidateQueries({ queryKey: ['chronic-summary'] }); reset(); setAddBP(false) },
      onError: (e) => setApiError(extractApiError(e)),
    })

    return (
      <Modal open={addBP} onClose={() => setAddBP(false)} title="Log Blood Pressure">
        {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input id="systolic" type="number" label="Systolic (mmHg)" required placeholder="e.g. 120"
              error={errors.systolic?.message} {...register('systolic')} />
            <Input id="diastolic" type="number" label="Diastolic (mmHg)" required placeholder="e.g. 80"
              error={errors.diastolic?.message} {...register('diastolic')} />
            <Input id="pulse" type="number" label="Pulse (bpm)" placeholder="e.g. 72" {...register('pulse')} />
          </div>
          <Input id="recorded_at_bp" type="datetime-local" label="Date & Time" required
            error={errors.recorded_at?.message} {...register('recorded_at')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setAddBP(false)}>Cancel</Button>
            <Button type="submit" fullWidth loading={isSubmitting}>Save Reading</Button>
          </div>
        </form>
      </Modal>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title={t('chronic.title')} subtitle={t('chronic.subtitle')} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('chronic.avgGlucose')} value={summary?.glucose.average_mg_dl?.toFixed(0) ?? '—'} unit="mg/dL" subtitle="7 days" />
        <StatCard label={t('chronic.avgSystolic')} value={summary?.blood_pressure.average_systolic?.toFixed(0) ?? '—'} unit="mmHg" subtitle="7 days" />
        <StatCard label={t('chronic.avgDiastolic')} value={summary?.blood_pressure.average_diastolic?.toFixed(0) ?? '—'} unit="mmHg" subtitle="7 days" />
        <StatCard label={t('chronic.readings')} value={(summary?.glucose.count ?? 0) + (summary?.blood_pressure.count ?? 0)} subtitle={t('chronic.totalThisWeek')} />
      </div>

      {/* Predictive Alerts */}
      {predictions && (
        <div className="space-y-3 mb-6">
          {/* Glucose Prediction */}
          {predictions.glucose?.status === 'success' && (
            <Card>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  predictions.glucose.alert
                    ? 'bg-amber-100'
                    : 'bg-emerald-100'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${
                    predictions.glucose.alert
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 font-display">
                    7-Day Glucose Forecast
                  </p>
                  {predictions.glucose.alert ? (
                    <div className="mt-1.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 font-body leading-relaxed">
                          {predictions.glucose.alert.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-body mt-1">
                      Your glucose is predicted to remain in a healthy range over the next 7 days.
                    </p>
                  )}
                  {predictions.glucose.predictions?.length > 0 && (
                    <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                      {predictions.glucose.predictions.map((p: any) => (
                        <div key={p.date} className="flex flex-col items-center shrink-0 w-12">
                          <div className={`text-xs font-bold font-display ${
                            p.predicted > 126 ? 'text-red-600' :
                            p.predicted > 100 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {p.predicted}
                          </div>
                          <div className="text-2xs text-gray-400 font-body">
                            {new Date(p.date).toLocaleDateString('en-KE', { weekday: 'short' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {predictions.glucose?.status === 'insufficient_data' && (
            <Card className="bg-surface-50">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-400 font-body">
                  Log {predictions.glucose.readings_needed} more fasting glucose readings
                  to unlock 7-day forecasting.
                </p>
              </div>
            </Card>
          )}

          {/* BP Prediction */}
          {predictions.blood_pressure?.status === 'success' && (
            <Card>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  predictions.blood_pressure.alert
                    ? 'bg-red-100'
                    : 'bg-emerald-100'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${
                    predictions.blood_pressure.alert
                      ? 'text-red-600'
                      : 'text-emerald-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 font-display">
                    7-Day Blood Pressure Forecast
                  </p>
                  {predictions.blood_pressure.alert ? (
                    <div className="mt-1.5 p-3 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800 font-body leading-relaxed">
                          {predictions.blood_pressure.alert.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-body mt-1">
                      Your blood pressure is predicted to remain stable over the next 7 days.
                    </p>
                  )}
                  {predictions.blood_pressure.predictions?.length > 0 && (
                    <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                      {predictions.blood_pressure.predictions.map((p: any) => (
                        <div key={p.date} className="flex flex-col items-center shrink-0 w-12">
                          <div className={`text-xs font-bold font-display ${
                            p.predicted >= 180 ? 'text-red-600' :
                            p.predicted >= 140 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {p.predicted}
                          </div>
                          <div className="text-2xs text-gray-400 font-body">
                            {new Date(p.date).toLocaleDateString('en-KE', { weekday: 'short' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {predictions.blood_pressure?.status === 'insufficient_data' && (
            <Card className="bg-surface-50">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-400 font-body">
                  Log {predictions.blood_pressure.readings_needed} more BP readings
                  to unlock 7-day forecasting.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Health Goals */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900 font-display">{t('chronic.goals')}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: t('chronic.targetFastingMin'), key: 'target_fasting_glucose_min', unit: 'mg/dL' },
            { label: t('chronic.targetFastingMax'), key: 'target_fasting_glucose_max', unit: 'mg/dL' },
            { label: t('chronic.targetSystolicMax'), key: 'target_systolic_max', unit: 'mmHg' },
            { label: t('chronic.targetDiastolicMax'), key: 'target_diastolic_max', unit: 'mmHg' },
            { label: t('chronic.targetMoodScoreMin'), key: 'target_mood_score_min', unit: '/ 10' },
          ].map(({ label, key, unit }) => (
            <div key={key} className="bg-surface-50 rounded-xl p-3 border border-gray-100">
              <p className="text-2xs text-gray-400 font-display uppercase tracking-wide">{label}</p>
              <p className="text-lg font-bold text-gray-900 font-display">
                {goal?.[key] ?? '—'}{' '}
                <span className="text-xs font-normal text-gray-400">{unit}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 font-body mt-3">
          Contact your doctor to set personalised target ranges. Coming soon: goal editing.
        </p>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit">
        {(['glucose', 'bp'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium font-display transition-all duration-150 ${
              tab === t ? 'bg-white shadow-sm text-primary-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'glucose' ? 'Glucose' : 'Blood Pressure'}
          </button>
        ))}
      </div>

      {/* Glucose Tab */}
      {tab === 'glucose' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddGlucose(true)}>{t('chronic.logGlucose')}</Button>
          </div>

          {glucoseChartData.length > 1 && (
            <Card>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-4">Glucose Trend</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={glucoseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 200]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} mg/dL`, 'Glucose']} />
                  <ReferenceLine y={100} stroke="#059669" strokeDasharray="4 4" label={{ value: 'Normal', position: 'right', fontSize: 10 }} />
                  <ReferenceLine y={126} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'High', position: 'right', fontSize: 10 }} />
                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {gLoading ? <PageLoader /> : !glucoseData?.results.length ? (
            <EmptyState 
              icon={<Activity className="w-8 h-8" />} 
              title={t('chronic.noGlucose')}
              message={t('chronic.logFirstGlucose')}
              action={<Button onClick={() => setAddGlucose(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Reading</Button>} 
            />
          ) : (
            <div className="space-y-2">
              {glucoseData.results.map((r) => (
                <Card key={r.id} padding="sm" className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 font-display">{r.value_mg_dl} <span className="text-gray-400 text-xs font-normal">mg/dL</span></p>
                    <p className="text-xs text-gray-500 font-body">{r.interpretation}</p>
                    <p className="text-xs text-gray-400 font-body">{formatDateTime(r.recorded_at)} · {r.context}</p>
                  </div>
                  <button onClick={() => setDeleteTarget({ id: r.id, type: 'glucose' })}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
          <Pagination
            count={glucoseData?.count ?? 0}
            currentPage={glucosePage}
            onPageChange={setGlucosePage}
          />
        </div>
      )}

      {/* BP Tab */}
      {tab === 'bp' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddBP(true)}>{t('chronic.logBP')}</Button>
          </div>

          {bpChartData.length > 1 && (
            <Card>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-4">BP Trend</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 200]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={120} stroke="#059669" strokeDasharray="4 4" />
                  <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="systolic" stroke="#3b82f6" strokeWidth={2} name="Systolic" dot={{ fill: '#3b82f6', r: 3 }} />
                  <Line type="monotone" dataKey="diastolic" stroke="#8b5cf6" strokeWidth={2} name="Diastolic" dot={{ fill: '#8b5cf6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {bpLoading ? <PageLoader /> : !bpData?.results.length ? (
            <EmptyState 
              icon={<Activity className="w-8 h-8" />} 
              title={t('chronic.noBP')}
              message={t('chronic.logFirstBP')}
              action={<Button onClick={() => setAddBP(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Reading</Button>} 
            />
          ) : (
            <div className="space-y-2">
              {bpData.results.map((r) => (
                <Card key={r.id} padding="sm" className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 font-display">{r.systolic}/{r.diastolic} <span className="text-gray-400 text-xs font-normal">mmHg</span>{r.pulse && <span className="text-gray-400 text-xs font-normal ml-2">{r.pulse} bpm</span>}</p>
                    <p className="text-xs text-gray-500 font-body">{r.classification}</p>
                    <p className="text-xs text-gray-400 font-body">{formatDateTime(r.recorded_at)}</p>
                  </div>
                  <button onClick={() =>  setDeleteTarget({ id: r.id, type: 'bp' })}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
          <Pagination
            count={bpData?.count ?? 0}
            currentPage={bpPage}
            onPageChange={setBpPage}
          />
        </div>
      )}

      <GlucoseModal />
      <BPModal />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        isDeleting={deleteGlucose.isPending || deleteBP.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          if (deleteTarget.type === 'glucose') deleteGlucose.mutate(deleteTarget.id)
          else deleteBP.mutate(deleteTarget.id)
        }}
        title={t('chronic.deleteConfirmTitle')}
        message={t('chronic.deleteConfirmMessage')}
      />
    </div>
  )
}
