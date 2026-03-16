/**
 * SHES Chronic Tracking Page
 * Blood glucose and blood pressure logging with trend charts.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { chronicApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { Card, PageHeader, StatCard, Badge, Modal, EmptyState, PageLoader, ErrorMessage } from '@/components/common'
import { extractApiError, formatDate, formatDateTime } from '@/utils'

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

const GLUCOSE_CONTEXT_OPTIONS = [
  { value: 'fasting',     label: 'Fasting (before meal)' },
  { value: 'post_meal_1h', label: '1 Hour After Meal' },
  { value: 'post_meal_2h', label: '2 Hours After Meal' },
  { value: 'random',      label: 'Random' },
  { value: 'bedtime',     label: 'Bedtime' },
]

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

  const { data: summary } = useQuery({ queryKey: ['chronic-summary'], queryFn: chronicApi.getSummary })
  const { data: glucoseData, isLoading: gLoading } = useQuery({
    queryKey: ['glucose'], queryFn: () => chronicApi.getGlucoseReadings(),
  })
  const { data: bpData, isLoading: bpLoading } = useQuery({
    queryKey: ['bp'], queryFn: () => chronicApi.getBPReadings(),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['glucose'] }),
  })
  const deleteBP = useMutation({
    mutationFn: chronicApi.deleteBPReading,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bp'] }),
  })

  // ── Glucose Add Modal ─────────────────────────────────────────────────────
  function GlucoseModal() {
    const [apiError, setApiError] = useState('')
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
      useForm<GlucoseForm>({ resolver: zodResolver(glucoseSchema) })

    const mutation = useMutation({
      mutationFn: (d: GlucoseForm) => chronicApi.addGlucoseReading({
        value_mg_dl: d.value_mg_dl, context: d.context as never,
        hba1c: d.hba1c ? Number(d.hba1c) : null,
        notes: d.notes ?? '', recorded_at: d.recorded_at,
      }),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['glucose'] }); qc.invalidateQueries({ queryKey: ['chronic-summary'] }); reset(); setAddGlucose(false) },
      onError: (e) => setApiError(extractApiError(e)),
    })

    return (
      <Modal open={addGlucose} onClose={() => setAddGlucose(false)} title="Log Glucose Reading">
        {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="value_mg_dl" type="number" label="Glucose (mg/dL)" required placeholder="e.g. 95"
              error={errors.value_mg_dl?.message} {...register('value_mg_dl')} />
            <Select id="context" label="Context" required placeholder="When?"
              options={GLUCOSE_CONTEXT_OPTIONS} error={errors.context?.message} {...register('context')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="hba1c" type="number" step="0.1" label="HbA1c % (optional)" placeholder="e.g. 5.4"
              {...register('hba1c')} />
            <Input id="recorded_at" type="datetime-local" label="Date & Time" required
              error={errors.recorded_at?.message} {...register('recorded_at')} />
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
      mutationFn: (d: BPForm) => chronicApi.addBPReading({
        systolic: d.systolic, diastolic: d.diastolic,
        pulse: d.pulse ? Number(d.pulse) : null,
        notes: d.notes ?? '', recorded_at: d.recorded_at,
      }),
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
      <PageHeader title="Chronic Tracking" subtitle="Monitor blood glucose and blood pressure over time" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg Glucose" value={summary?.glucose.average_mg_dl?.toFixed(0) ?? '—'} unit="mg/dL" subtitle="7 days" />
        <StatCard label="Avg Systolic" value={summary?.blood_pressure.average_systolic?.toFixed(0) ?? '—'} unit="mmHg" subtitle="7 days" />
        <StatCard label="Avg Diastolic" value={summary?.blood_pressure.average_diastolic?.toFixed(0) ?? '—'} unit="mmHg" subtitle="7 days" />
        <StatCard label="Readings" value={(summary?.glucose.count ?? 0) + (summary?.blood_pressure.count ?? 0)} subtitle="Total this week" />
      </div>

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
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddGlucose(true)}>Log Glucose</Button>
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
            <EmptyState icon={<Activity className="w-8 h-8" />} title="No glucose readings yet"
              action={<Button onClick={() => setAddGlucose(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Reading</Button>} />
          ) : (
            <div className="space-y-2">
              {glucoseData.results.map((r) => (
                <Card key={r.id} padding="sm" className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 font-display">{r.value_mg_dl} <span className="text-gray-400 text-xs font-normal">mg/dL</span></p>
                    <p className="text-xs text-gray-500 font-body">{r.interpretation}</p>
                    <p className="text-xs text-gray-400 font-body">{formatDateTime(r.recorded_at)} · {r.context}</p>
                  </div>
                  <button onClick={() => deleteGlucose.mutate(r.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BP Tab */}
      {tab === 'bp' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddBP(true)}>Log BP</Button>
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
            <EmptyState icon={<Activity className="w-8 h-8" />} title="No BP readings yet"
              action={<Button onClick={() => setAddBP(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Reading</Button>} />
          ) : (
            <div className="space-y-2">
              {bpData.results.map((r) => (
                <Card key={r.id} padding="sm" className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 font-display">{r.systolic}/{r.diastolic} <span className="text-gray-400 text-xs font-normal">mmHg</span>{r.pulse && <span className="text-gray-400 text-xs font-normal ml-2">{r.pulse} bpm</span>}</p>
                    <p className="text-xs text-gray-500 font-body">{r.classification}</p>
                    <p className="text-xs text-gray-400 font-body">{formatDateTime(r.recorded_at)}</p>
                  </div>
                  <button onClick={() => deleteBP.mutate(r.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <GlucoseModal />
      <BPModal />
    </div>
  )
}
