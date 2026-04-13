/**
 * SHES Medications Page
 * My medications, KEML search, and drug interaction checker.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, AlertTriangle, Search, Pill, ShieldAlert } from 'lucide-react'
import { medicationsApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { Card, PageHeader, Badge, Modal, EmptyState, PageLoader, ErrorMessage, SuccessMessage } from '@/components/common'
import { extractApiError, FREQUENCY_LABELS, INTERACTION_COLORS, formatDate } from '@/utils'
import type { Medication, InteractionCheckResult } from '@/types'
import { Pagination } from '@/components/common/Pagination'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'




// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = 'my' | 'search' | 'interactions'

// ─── Add medication form ──────────────────────────────────────────────────────
const addSchema = z.object({
  medication_id: z.coerce.number().min(1, 'Select a medication'),
  dosage:        z.string().min(1, 'Enter dosage'),
  frequency:     z.string().min(1, 'Select frequency'),
  start_date:    z.string().min(1, 'Select start date'),
  end_date:      z.string().optional(),
  prescribing_doctor: z.string().optional(),
  notes:         z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

const FREQ_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))

function AddMedicationModal({
  open, onClose, medications,
}: { open: boolean; onClose: () => void; medications: Medication[] }) {
  const qc = useQueryClient()
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<AddForm>({ resolver: zodResolver(addSchema) })

  const mutation = useMutation({
    mutationFn: (data: AddForm) =>
      medicationsApi.addMedication({ ...data, is_active: true, notes: data.notes ?? '', prescribing_doctor: data.prescribing_doctor ?? '', end_date: data.end_date ?? null, frequency: data.frequency as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-medications'] })
      reset()
      onClose()
    },
    onError: (err) => setApiError(extractApiError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Add Medication" maxWidth="md">
      {apiError && <div className="mb-4"><ErrorMessage message={apiError} /></div>}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Select
          id="medication_id" label="Medication" required
          placeholder="Select a medication"
          options={medications.map((m) => ({ value: String(m.id), label: `${m.name}${m.generic_name ? ` (${m.generic_name})` : ''}` }))}
          error={errors.medication_id?.message}
          {...register('medication_id')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input id="dosage" label="Dosage" placeholder="e.g. 500mg" required
            error={errors.dosage?.message} {...register('dosage')} />
          <Select id="frequency" label="Frequency" required placeholder="Select frequency"
            options={FREQ_OPTIONS} error={errors.frequency?.message} {...register('frequency')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input id="start_date" type="date" label="Start date" required
            error={errors.start_date?.message} {...register('start_date')} />
          <Input id="end_date" type="date" label="End date (optional)"
            {...register('end_date')} />
        </div>
        <Input id="prescribing_doctor" label="Prescribing doctor (optional)"
          placeholder="Dr. Name" {...register('prescribing_doctor')} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={isSubmitting}>Add Medication</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function MedicationsPage() {
  const [tab, setTab]         = useState<Tab>('my')
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch]   = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [selectedIds, setSelectedIds] = useState<Record<string, number>>({})
  const [interactionResult, setInteractionResult] = useState<InteractionCheckResult | null>(null)
  const [checkError, setCheckError] = useState('')
  const qc = useQueryClient()
  const { t } = useTranslation()
  const [medPage, setMedPage]   = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: myMeds, isLoading: myLoading } = useQuery({
    queryKey: ['my-medications', medPage],
    queryFn: () => medicationsApi.getMyMedications(),
  })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['medication-search', debouncedSearch],
    queryFn: () => medicationsApi.list(debouncedSearch),
    enabled: tab === 'search',
  })

  const deleteMutation = useMutation({
    mutationFn: medicationsApi.deleteMedication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-medications'] })
      setDeleteId(null)   
    },
  })

  const checkMutation = useMutation({
    mutationFn: medicationsApi.checkInteractions,
    onSuccess: (data) => { setInteractionResult(data); setCheckError('') },
    onError: (err) => setCheckError(extractApiError(err)),
  })

  const toggleId = (uuid: string, medicationId: number) => {
    setSelectedIds(prev => {
      const next = { ...prev }
      if (uuid in next) delete next[uuid]
      else next[uuid] = medicationId
      return next
    })
  }


  const allMedications = searchResults?.results ?? []

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('medications.title')}
        subtitle={t('medications.subtitle')}
        action={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
            {t('medications.addMedication')}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6 w-fit">
        {(['my', 'search', 'interactions'] as const).map((tabName) => (
          <button key={tabName} onClick={() => setTab(tabName)}
            className={`px-4 py-2 rounded-lg text-sm font-medium font-display transition-all duration-150 ${
              tab === tabName ? 'bg-white shadow-sm text-primary-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
          </button>
        ))}
      </div>

      {/* My Medications */}
      {tab === 'my' && (
        myLoading ? <PageLoader /> :
        !myMeds?.results.length ? (
          <EmptyState icon={<Pill className="w-8 h-8" />} 
            title={t('medications.noMedications')}
            message={t('medications.noMedsMessage')}
            action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Add Medication</Button>}
          />
        ) : (
          <div className="space-y-3">
            {myMeds.results.map((med) => (
              <Card key={med.id} className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-primary-50 shrink-0">
                    <Pill className="w-4 h-4 text-primary-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 font-display text-sm truncate">{med.medication_name}</p>
                    <p className="text-xs text-gray-500 font-body">{med.dosage} · {FREQUENCY_LABELS[med.frequency]}</p>
                    <p className="text-xs text-gray-400 font-body">From {formatDate(med.start_date)}{med.end_date ? ` to ${formatDate(med.end_date)}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={med.is_active ? 'success' : 'default'}>{med.is_active ? 'Active' : 'Inactive'}</Badge>
                  <button onClick={() => setDeleteId(med.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                    aria-label="Delete medication">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
            <Pagination
              count={myMeds?.count ?? 0}
              currentPage={medPage}
              onPageChange={setMedPage}
            />
          </div>
        )
      )}

      {/* KEML Search */}
      {tab === 'search' && (
        <div className="space-y-4">
          <Input id="search" placeholder={t('medications.searchPlaceholder')}
            leftAddon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => {
              const v = e.target.value
              setSearch(v)
            }} 
          />
          {searchLoading ? <PageLoader /> : (
            <div className="space-y-2">
              {allMedications.map((med) => (
                <Card key={med.id} padding="sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 font-display">{med.name}</p>
                      <p className="text-xs text-gray-500 font-body">{med.generic_name} · {med.drug_class}</p>
                      <p className="text-xs text-gray-400 font-body mt-1">{med.common_uses}</p>
                      {med.standard_dosage && <p className="text-xs text-primary-700 font-body mt-0.5">Dosage: {med.standard_dosage}</p>}
                    </div>
                    {med.is_keml_listed && <Badge variant="success">KEML</Badge>}
                  </div>
                </Card>
              ))}
              {!allMedications.length && search && (
                <p className="text-sm text-gray-400 text-center py-8 font-body">No medications found for "{search}"</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interaction Checker */}
      {tab === 'interactions' && (
        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-gray-700 font-display mb-3">{t('medications.selectForCheck')}</p>
            {myLoading ? <PageLoader /> : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(myMeds?.results ?? []).map((med, index) => {
                  const medId = med.id ?? String(index)
                  // const numericId = med.medication_id 

                  // console.log('med object:', myMeds?.results[0])
                  return (
                    <label
                      key={`med-${medId}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={!!selectedIds[medId]}
                        onChange={() => {
                          if (med.medication_id == null) return
                          toggleId(medId, med.medication_id)
                        }}
                      />
                      <span className="text-sm text-gray-700 font-body">
                        {med.medication_name} <span className="text-gray-400">({med.dosage})</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              leftIcon={<ShieldAlert className="w-4 h-4" />}
              disabled={Object.keys(selectedIds).length < 2}
              loading={checkMutation.isPending}
              onClick={() => checkMutation.mutate(Object.values(selectedIds))}
            >
              Check Interactions ({Object.keys(selectedIds).length} selected)
            </Button>
          </Card>
          {checkError && <ErrorMessage message={checkError} />}
          {interactionResult && (
            <Card>
              {interactionResult.interactions_found === 0 ? (
                <SuccessMessage message={t('medications.noInteractions')} />
              ) : (
                <div className="space-y-3">
                  {interactionResult.major_warnings > 0 && (
                    <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3 border border-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      <p className="text-sm text-red-700 font-body">{interactionResult.message}</p>
                    </div>
                  )}
                  {interactionResult.data.map((interaction) => (
                    <div
                      key={interaction.id}
                      className={`rounded-xl border p-4 ${INTERACTION_COLORS[interaction.severity]}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold font-display">{interaction.drug_a_name} ↔ {interaction.drug_b_name}</p>
                        <Badge>{interaction.severity}</Badge>
                      </div>
                      <p className="text-xs font-body">{interaction.description}</p>
                      {interaction.clinical_action && (
                        <p className="text-xs font-body mt-1 opacity-80">Action: {interaction.clinical_action}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}


      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
        title={t('medications.deleteConfirmTitle')}
        message={t('medications.deleteConfirmMessage')}
      />
      
      <AddMedicationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        medications={searchResults?.results ?? myMeds?.results.map(m => ({
          id: Number(m.medication_id),
          name: m.medication_name,
        } as Medication)) ?? []}

      />
    </div>
  )
}
