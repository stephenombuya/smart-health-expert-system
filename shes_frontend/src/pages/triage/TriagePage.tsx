/**
 * SHES Triage Page
 * Multi-step symptom entry → inference engine → results display.
 */
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, AlertTriangle, CheckCircle2, History, Wand2, Loader2, Languages } from 'lucide-react'
import { triageApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { Card, PageHeader, UrgencyBadge, ErrorMessage } from '@/components/common'
import { extractApiError, URGENCY_ICON } from '@/utils'
import type { TriageSession } from '@/types'
import { useQueryClient } from '@tanstack/react-query'

// ─── Schema ───────────────────────────────────────────────────────────────────
const symptomSchema = z.object({
  name:          z.string().min(2, 'Describe the symptom'),
  severity:      z.coerce.number().min(1).max(10),
  duration_days: z.coerce.number().min(0).optional(),
  body_location: z.string().optional(),
})

const schema = z.object({
  symptoms: z.array(symptomSchema).min(1, 'Add at least one symptom').max(20),
})

type FormData = z.infer<typeof schema>

const SEVERITY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} – ${['Barely noticeable','Very mild','Mild','Noticeable','Moderate','Quite uncomfortable','Severe','Very severe','Extremely severe','Worst possible'][i]}`,
}))

// ─── Result Panel ─────────────────────────────────────────────────────────────
function TriageResult({ session, onReset }: { session: TriageSession; onReset: () => void }) {
  const navigate = useNavigate()
  const { t } = useTranslation()


  return (
    <div className="space-y-5 animate-slide-up">
      {/* Urgency header */}
      <Card className="text-center py-8 px-6">
        <div className="text-5xl mb-4">{URGENCY_ICON[session.urgency_level]}</div>
        <UrgencyBadge level={session.urgency_level} />
        <p className="mt-4 text-sm font-body text-gray-700 leading-relaxed max-w-lg mx-auto">
          {session.recommendation}
        </p>
      </Card>

      {/* Red flags */}
      {session.red_flags_detected.length > 0 && (
        <Card className="border border-red-200 bg-red-50">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 font-display mb-1">{t('triage.warningSigns')}</p>
              <ul className="space-y-0.5">
                {session.red_flags_detected.map((flag) => (
                  <li key={flag} className="text-sm text-red-700 font-body">• {flag}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Explanation */}
      {session.layman_explanation && (
        <Card>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-2">
            {t('triage.explanation')}
          </p>
          <p className="text-sm text-gray-700 font-body leading-relaxed">
            {session.layman_explanation}
          </p>
        </Card>
      )}

      {/* Matched conditions */}
      {session.matched_conditions.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-3">
            {t('triage.possibleConditions')}
          </p>
          <div className="space-y-4">
            {session.matched_conditions.map((cond) => (
              <div key={cond.name}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800 font-display">{cond.name}</p>
                  <span className="text-xs text-gray-400 font-body">
                    {t('triage.match', { percent: Math.round(cond.match_ratio * 100) })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-body mb-2">{cond.description}</p>
                {cond.home_care_tips.length > 0 && (
                  <ul className="space-y-1">
                    {cond.home_care_tips.slice(0, 3).map((tip) => (
                      <li key={tip} className="flex gap-2 text-xs text-gray-600 font-body">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onReset} fullWidth>
          {t('triage.newAssessment')}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/triage/history')} fullWidth
          leftIcon={<History className="w-4 h-4" />}>
          {t('triage.viewHistory')}
        </Button>
      </div>
    </div>
  )
}

// ─── Symptom Autocomplete ─────────────────────────────────────────────────────
const COMMON_SYMPTOMS = [
  "fever","headache","cough","fatigue","nausea","vomiting","diarrhoea",
  "chest pain","shortness of breath","dizziness","sore throat","runny nose",
  "body aches","chills","sweating","loss of appetite","abdominal pain",
  "back pain","joint pain","muscle pain","rash","swelling","burning urination",
  "frequent urination","blurred vision","excessive thirst","weight loss",
  "difficulty breathing","sneezing","nasal congestion","wheezing","restless",
  "anxious","insomnia","pale skin","weakness","tingling feet",
]

const SymptomAutocomplete = React.forwardRef<HTMLInputElement, {
  id: string; label: string; error?: string; onChange: any; onBlur: any; name: string;
}>(({ id, label, error, onChange, onBlur, name }, ref) => {
  const [value, setValue]         = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShow]    = useState(false)
  const { t } = useTranslation()
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    onChange(e)
    if (v.length >= 2) {
      setSuggestions(COMMON_SYMPTOMS.filter(s => s.includes(v.toLowerCase())).slice(0, 6))
      setShow(true)
    } else {
      setShow(false)
    }
  }

  const pick = (symptom: string) => {
    setValue(symptom)
    onChange({ target: { value: symptom, name } })
    setShow(false)
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 font-display">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        id={id} ref={ref} name={name}
        value={value}
        onChange={handleChange}
        onBlur={(e) => { setTimeout(() => setShow(false), 150); onBlur(e) }}
        placeholder={t('triage.symptomPlaceholder')}
        autoComplete="off"
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-body bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:border-transparent"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-card-hover z-10 overflow-hidden">
          {suggestions.map(s => (
            <button key={s} type="button" onMouseDown={() => pick(s)}
              className="w-full text-left px-3.5 py-2 text-sm font-body text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600">⚠ {error}</p>}
    </div>
  )
})
SymptomAutocomplete.displayName = 'SymptomAutocomplete'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TriagePage() {
  const navigate = useNavigate()
  const qc = useQueryClient() // 🔹 Fixed: initialized query client
  const [result, setResult]   = useState<TriageSession | null>(null)
  const [apiError, setApiError] = useState('')
  const { t } = useTranslation()
  const [nlpMode, setNlpMode]       = useState(false)
  const [nlpText, setNlpText]       = useState('')
  const [nlpLoading, setNlpLoading] = useState(false)
  const [nlpError, setNlpError]     = useState('')

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { symptoms: [{ name: '', severity: 5, duration_days: 1, body_location: '' }] },
    })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'symptoms' })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const session = await triageApi.startSession(data.symptoms)
      qc.invalidateQueries({ queryKey: ['triage-history'] })
      setResult(session)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setApiError(extractApiError(err))
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title={t('triage.title')}
          subtitle={t('triage.subtitle')}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/triage/history')}
              leftIcon={<History className="w-4 h-4" />}
            >
              {t('triage.history')}
            </Button>
          }
        />

        <TriageResult session={result} onReset={() => setResult(null)} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Symptom Triage"
        subtitle="Describe your symptoms and our clinical inference engine will assess urgency"
        action={
          <Button size="sm" variant="secondary" onClick={() => navigate('/triage/history')}
            leftIcon={<History className="w-4 h-4" />}>
            History
          </Button>
        }
      />

      {/* NLP Input Toggle */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50 shrink-0">
              <Wand2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 font-display">
                AI Symptom Extraction
              </p>
              <p className="text-xs text-gray-400 font-body mt-0.5">
                Describe your symptoms in plain English or Swahili and our AI will
                fill in the form automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setNlpMode(m => !m); setNlpError('') }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-display transition-all ${
              nlpMode
                ? 'bg-violet-600 text-white'
                : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            {nlpMode ? 'Hide' : 'Try it'}
          </button>
        </div>

        {nlpMode && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-body">
              <Languages className="w-3.5 h-3.5" />
              Supports English and Swahili
            </div>
            <textarea
              value={nlpText}
              onChange={e => setNlpText(e.target.value)}
              placeholder={
                'Examples:\n' +
                '"I have had a high fever, severe headache and chills for 3 days"\n' +
                '"Nimekuwa na homa kali na maumivu ya kichwa kwa siku tatu"'
              }
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
                        font-body bg-white text-gray-900 placeholder-gray-300
                        focus:outline-none focus:ring-2 focus:ring-violet-500
                        focus:border-transparent resize-none"
            />

            {nlpError && <ErrorMessage message={nlpError} />}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={nlpLoading}
              disabled={!nlpText.trim()}
              leftIcon={<Wand2 className="w-4 h-4" />}
              onClick={async () => {
                setNlpError('')
                setNlpLoading(true)
                try {
                  const extracted = await triageApi.extractSymptoms(nlpText)
                  // Replace form symptoms with extracted ones
                  replace(extracted.map(s => ({
                    name:             s.name,
                    severity:         s.severity,
                    duration_days:    s.duration_days,
                    body_location:    s.body_location || '',
                    additional_notes: '',
                  })))
                  setNlpMode(false)
                  setNlpText('')
                } catch (err) {
                  setNlpError(extractApiError(err) || 'Extraction failed. Please try again or enter symptoms manually.')
                } finally {
                  setNlpLoading(false)
                }
              }}
            >
              {nlpLoading ? 'Extracting…' : 'Extract Symptoms'}
            </Button>

            <p className="text-xs text-gray-400 font-body">
              The AI will fill the symptom form below. You can review and edit before submitting.
            </p>
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {apiError && <ErrorMessage message={apiError} />}

        <div className="space-y-3">
          {fields.map((field, idx) => {
            const { ref, ...rest } = register(`symptoms.${idx}.name`)
            return (
              <Card key={field.id} className="relative animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-700 font-display">
                    {t('triage.symptom')} {idx + 1}
                  </p>
                  {fields.length > 1 && (
                    <button
                      type="button" onClick={() => remove(idx)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                      aria-label={t('triage.removeSymptom')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SymptomAutocomplete
                    id={`symptoms.${idx}.name`}
                    label={t('triage.symptomName')}
                    error={(errors.symptoms?.[idx]?.name as { message?: string })?.message}
                    {...rest}
                    ref={ref}
                  />
                  <Select
                    id={`symptoms.${idx}.severity`}
                    label={t('triage.severity')}
                    options={SEVERITY_OPTIONS}
                    error={(errors.symptoms?.[idx]?.severity as { message?: string })?.message}
                    {...register(`symptoms.${idx}.severity`)}
                  />
                  <Input
                    id={`symptoms.${idx}.duration_days`}
                    type="number" min={0} max={365}
                    label={t('triage.duration')}
                    placeholder="e.g. 2"
                    {...register(`symptoms.${idx}.duration_days`)}
                  />
                  <Input
                    id={`symptoms.${idx}.body_location`}
                    label={t('triage.bodyLocation')}
                    placeholder="e.g. chest, lower back"
                    {...register(`symptoms.${idx}.body_location`)}
                  />
                </div>
              </Card>
            )
          })}
        </div>

        {fields.length < 20 && (
          <Button
            type="button" variant="secondary" size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => append({ name: '', severity: 5, duration_days: 1, body_location: '' })}
          >
            {t('triage.addSymptom')}
          </Button>
        )}

        <div className="pt-2">
          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            {isSubmitting ? t('triage.assessing') : t('triage.assess')}
          </Button>
          <p className="text-xs text-center text-gray-400 font-body mt-3">
            {t('triage.disclaimer')}
          </p>
        </div>
      </form>
    </div>
  )
}
