/**
 * SHES Lab Results Page
 * Submit lab reports and view NLP-generated plain-language interpretations.
 */
import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, FlaskConical, ChevronDown, ChevronUp, Upload, ScanLine, CheckCircle2 } from 'lucide-react'
import { labApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Card, PageHeader, Badge, Modal, EmptyState, PageLoader, ErrorMessage } from '@/components/common'
import { extractApiError, formatDate, LAB_STATUS_COLORS } from '@/utils'
import type { LabResult } from '@/types'
import { sanitiseSubmission } from '@/utils/sanitise'
import { Pagination } from '@/components/common/Pagination'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'



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
  const [labPage, setLabPage]   = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { t } = useTranslation()
  const [ocrResult, setOcrResult]     = useState<any>(null)
  const [ocrLoading, setOcrLoading]   = useState(false)
  const [ocrError, setOcrError]       = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lab-results', labPage],
    queryFn: () => labApi.getResults(labPage),
  })

  const deleteMutation = useMutation({
    mutationFn: labApi.deleteResult,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-results'] })
      setDeleteId(null)
    },
  })

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('lab.title')}
        subtitle={t('lab.subtitle')}
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
            {t('lab.submitReport')}
          </Button>
        }
      />

      {/* OCR Upload Card */}
      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary-50 shrink-0">
            <ScanLine className="w-5 h-5 text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 font-display">
              Upload Lab Report
            </p>
            <p className="text-xs text-gray-400 font-body mt-0.5">
              Take a photo or upload a PDF of your paper lab report.
              Our AI will extract and interpret the values automatically.
            </p>

            {ocrError && (
              <div className="mt-3">
                <ErrorMessage message={ocrError} />
              </div>
            )}

            {ocrResult ? (
              <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-700 font-display">
                    {ocrResult.tests_found} test{ocrResult.tests_found !== 1 ? 's' : ''} extracted successfully
                  </p>
                </div>
                <div className="space-y-1 mb-3">
                  {ocrResult.raw_results.slice(0, 5).map((r: any, i: number) => (
                    <p key={i} className="text-xs text-emerald-700 font-body">
                      {r.test_name}: <strong>{r.value}</strong> {r.unit}
                    </p>
                  ))}
                  {ocrResult.raw_results.length > 5 && (
                    <p className="text-xs text-emerald-500 font-body">
                      + {ocrResult.raw_results.length - 5} more tests
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowAddModal(true)
                    }}
                  >
                    Save This Report
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOcrResult(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setOcrError('')
                    setOcrLoading(true)
                    try {
                      const result = await labApi.uploadReport(file)
                      setOcrResult(result)
                    } catch (err) {
                      setOcrError(extractApiError(err) || 'Failed to process the report. Try a clearer image.')
                    } finally {
                      setOcrLoading(false)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  loading={ocrLoading}
                  leftIcon={<Upload className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {ocrLoading ? 'Processing…' : 'Upload Report'}
                </Button>
                <p className="text-xs text-gray-400 font-body">JPEG, PNG, or PDF · max 10MB</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : !data?.results.length ? (
        <EmptyState
          icon={<FlaskConical className="w-8 h-8" />}
          title={t('lab.noResults')}
          message={t('lab.noResultsMsg')}
          action={
            <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              {t('lab.submitReport')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.results.map((result) => (
            <div key={result.id} className="relative group">
              <ResultCard result={result} />
              <button
                onClick={() => setDeleteId(result.id)}
                className="absolute top-3 right-10 p-1.5 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('lab.deleteConfirmTitle')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination
        count={data?.count ?? 0}
        currentPage={labPage}
        onPageChange={setLabPage}
      />

      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
        title={t('lab.deleteConfirmTitle')}
        message={t('lab.deleteConfirmMessage')}
      />
      
      <AddLabModal 
        open={showAddModal || addOpen} 
        onClose={() => { setShowAddModal(false); setAddOpen(false); setOcrResult(null) }}
        prefill={ocrResult}
      />
    </div>
  )
}

function AddLabModal({ 
  open, 
  onClose, 
  prefill = null, 
}: { 
  open: boolean; 
  onClose: () => void 
  prefill?: { raw_results: Array<{ test_name: string; value: string; unit: string }> } | null
}) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [apiError, setApiError] = useState('')

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LabForm>({
      resolver: zodResolver(schema),
      defaultValues: { raw_results: [{ test_name: '', value: '', unit: '' }] },
    })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'raw_results' })

  const mutation = useMutation({
    mutationFn: (d: LabForm) => labApi.submitResult(sanitiseSubmission({
      lab_name: d.lab_name ?? '',
      test_date: d.test_date,
      raw_results: d.raw_results.map((r) => ({ test_name: r.test_name, value: r.value, unit: r.unit ?? '' })),
    })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lab-results'] }); reset(); onClose() },
    onError: (e) => setApiError(extractApiError(e)),
  })

  useEffect(() => {
    if (prefill?.raw_results) {
      replace(prefill.raw_results.map(r => ({
        test_name: r.test_name,
        value:     r.value,
        unit:      r.unit ?? '',
      })))
    }
  }, [prefill])

  return (
    <Modal open={open} onClose={onClose} title={t('lab.submitReport')} maxWidth="lg">
      {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input 
            id="lab_name" 
            label={t('lab.labName')}
            placeholder={t('lab.labName')}
            {...register('lab_name')} 
          />
          <Input 
            id="test_date" 
            type="date" 
            label={t('lab.testDate')}
            required
            error={errors.test_date?.message} 
            {...register('test_date')} 
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 font-display mb-2">{t('lab.testName')} *</p>
          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <Input 
                  id={`raw_results.${idx}.test_name`} 
                  label={idx === 0 ? t('lab.testName') : undefined}
                  placeholder={t('lab.testName')}
                  error={(errors.raw_results?.[idx]?.test_name as { message?: string })?.message}
                  {...register(`raw_results.${idx}.test_name`)} 
                />
                <Input 
                  id={`raw_results.${idx}.value`} 
                  label={idx === 0 ? t('lab.value') : undefined}
                  placeholder={t('lab.value')}
                  error={(errors.raw_results?.[idx]?.value as { message?: string })?.message}
                  {...register(`raw_results.${idx}.value`)} />
                <Input 
                  id={`raw_results.${idx}.unit`} 
                  label={idx === 0 ? t('lab.unit') : undefined}
                  placeholder={t('lab.unit')}
                  {...register(`raw_results.${idx}.unit`)} 
                />
                <button type="button" onClick={() => remove(idx)}
                  className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl mb-0.5" aria-label={t('lab.deleteConfirmTitle')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => append({ test_name: '', value: '', unit: '' })}>
            {t('lab.addTest')}
          </Button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={isSubmitting}>{t('lab.submit')}</Button>
        </div>
      </form>
    </Modal>
  )
}
