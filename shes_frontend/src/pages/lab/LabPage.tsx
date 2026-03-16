/**
 * SHES Lab Results Page
 * Submit lab reports and view NLP-generated plain-language interpretations.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react'
import { labApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card, PageHeader, Badge, Modal, EmptyState, PageLoader, ErrorMessage } from '@/components/common'
import { extractApiError, formatDate, LAB_STATUS_COLORS } from '@/utils'
import type { LabResult } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  lab_name:  z.string().optional(),
  test_date: z.string().min(1, 'Select test date'),
  raw_results: z.array(z.object({
    test_name: z.string().min(1, 'Required'),
    value:     z.string().min(1, 'Required'),
    unit:      z.string().optional(),
  })).min(1, 'Add at least one test result'),
})
type LabForm = z.infer<typeof schema>

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  normal:     'success',
  elevated:   'warning',
  high:       'danger',
  low:        'default',
  unknown:    'default',
  parse_error:'default',
}

function AddLabModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [apiError, setApiError] = useState('')

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LabForm>({
      resolver: zodResolver(schema),
      defaultValues: { raw_results: [{ test_name: '', value: '', unit: '' }] },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'raw_results' })

  const mutation = useMutation({
    mutationFn: (d: LabForm) => labApi.submitResult({
      lab_name: d.lab_name ?? '',
      test_date: d.test_date,
      raw_results: d.raw_results.map((r) => ({ test_name: r.test_name, value: r.value, unit: r.unit ?? '' })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lab-results'] }); reset(); onClose() },
    onError: (e) => setApiError(extractApiError(e)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Submit Lab Results" maxWidth="lg">
      {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input id="lab_name" label="Laboratory name (optional)" placeholder="e.g. Aga Khan Hospital"
            {...register('lab_name')} />
          <Input id="test_date" type="date" label="Test date" required
            error={errors.test_date?.message} {...register('test_date')} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 font-display mb-2">Test Results *</p>
          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <Input id={`raw_results.${idx}.test_name`} label={idx === 0 ? 'Test Name' : undefined}
                  placeholder="e.g. Haemoglobin"
                  error={(errors.raw_results?.[idx]?.test_name as { message?: string })?.message}
                  {...register(`raw_results.${idx}.test_name`)} />
                <Input id={`raw_results.${idx}.value`} label={idx === 0 ? 'Value' : undefined}
                  placeholder="e.g. 14.5"
                  error={(errors.raw_results?.[idx]?.value as { message?: string })?.message}
                  {...register(`raw_results.${idx}.value`)} />
                <Input id={`raw_results.${idx}.unit`} label={idx === 0 ? 'Unit' : undefined}
                  placeholder="e.g. g/dL" {...register(`raw_results.${idx}.unit`)} />
                <button type="button" onClick={() => remove(idx)}
                  className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl mb-0.5" aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => append({ test_name: '', value: '', unit: '' })}>
            Add test
          </Button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={isSubmitting}>Interpret Results</Button>
        </div>
      </form>
    </Modal>
  )
}

function ResultCard({ result }: { result: LabResult }) {
  const [expanded, setExpanded] = useState(false)
  const abnormal = result.interpreted_results.filter((r) => r.status !== 'normal' && r.status !== 'parse_error')

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-gray-900 font-display">
              {result.lab_name || 'Laboratory Report'}
            </p>
            <span className="text-xs text-gray-400 font-body">{formatDate(result.test_date)}</span>
            <Badge variant={abnormal.length > 0 ? 'warning' : 'success'}>
              {abnormal.length > 0 ? `${abnormal.length} abnormal` : 'All normal'}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 font-body">{result.interpreted_results.length} test{result.interpreted_results.length !== 1 ? 's' : ''} · Submitted {formatDate(result.created_at)}</p>
        </div>
        <button onClick={() => setExpanded((e) => !e)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Toggle">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {/* Summary */}
          <div className="bg-surface-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 font-display uppercase tracking-wide mb-2">Summary</p>
            <p className="text-sm text-gray-700 font-body leading-relaxed whitespace-pre-line">{result.overall_summary}</p>
          </div>

          {/* Individual results */}
          <div className="space-y-2">
            {result.interpreted_results.map((item, i) => (
              <div key={i} className={`flex items-start justify-between gap-3 p-3 rounded-xl ${LAB_STATUS_COLORS[item.status]}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-display">{item.test_name}</p>
                    <span className="text-sm font-body">{item.value} {item.unit}</span>
                    <Badge variant={STATUS_BADGE[item.status] ?? 'default'}>{item.status}</Badge>
                  </div>
                  <p className="text-xs font-body mt-0.5 opacity-80">{item.advice}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function LabPage() {
  const [addOpen, setAddOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['lab-results'],
    queryFn: () => labApi.getResults(),
  })

  const deleteMutation = useMutation({
    mutationFn: labApi.deleteResult,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-results'] }),
  })

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Lab Results"
        subtitle="Submit your lab reports for plain-language interpretation"
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
            Submit Report
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : !data?.results.length ? (
        <EmptyState
          icon={<FlaskConical className="w-8 h-8" />}
          title="No lab results yet"
          message="Submit a lab report and our system will explain it in simple language."
          action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Submit Report</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.results.map((result) => (
            <div key={result.id} className="relative group">
              <ResultCard result={result} />
              <button
                onClick={() => deleteMutation.mutate(result.id)}
                className="absolute top-3 right-10 p-1.5 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete result"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddLabModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
