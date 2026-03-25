/**
 * SHES Dashboard Page
 * Overview of the patient's recent health data across all modules.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Stethoscope, Pill, Activity, Brain, FlaskConical, ArrowRight, TrendingUp, Minus, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { chronicApi, triageApi, mentalHealthApi } from '@/api/services'
import { Card, StatCard, UrgencyBadge, PageLoader, MoodBadge } from '@/components/common'
import { formatRelative, URGENCY_ICON } from '@/utils'

// ─── Quick action cards ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { to: '/triage',      Icon: Stethoscope, label: 'Start Triage',       desc: 'Assess symptoms now',         color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { to: '/medications', Icon: Pill,        label: 'Medications',        desc: 'Check drug interactions',     color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { to: '/chronic',     Icon: Activity,    label: 'Log Vitals',         desc: 'Record BP or glucose',        color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { to: '/mental',      Icon: Brain,       label: 'Mood Check-in',      desc: 'How are you feeling?',        color: 'bg-violet-50 text-violet-700 border-violet-100' },
  { to: '/lab',         Icon: FlaskConical,label: 'Lab Results',        desc: 'Interpret your report',       color: 'bg-rose-50 text-rose-700 border-rose-100' },
]

export default function DashboardPage() {
  const { user } = useAuth()

  const { t } = useTranslation()

  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary  } =
    useQuery({ queryKey: ['chronic-summary'], queryFn: chronicApi.getSummary, staleTime: 1000 * 60 * 5 })

  const { data: triageHistory, isLoading: triageLoading, isError: triageError, refetch: refetchTriage  } =
    useQuery({ queryKey: ['triage-history'], queryFn: () => triageApi.getHistory(1), staleTime: 1000 * 60 * 5 })

  const { data: moodSummary, isLoading: moodLoading, isError: moodError, refetch: refetchMood  } = useQuery({ 
    queryKey: ['mood-summary'], 
    queryFn: mentalHealthApi.getMoodSummary,
    staleTime: 1000 * 60 * 15
  })

  const { data: riskSummary } = useQuery({
    queryKey: ['risk-summary'],
    queryFn:  chronicApi.getRiskSummary,
    staleTime: 1000 * 60 * 15,
  })

  const latestTriage = triageHistory?.results?.[0]

  const hour = new Date().getHours()
  
  const greeting = hour < 12
    ? t('dashboard.greeting_morning')
    : hour < 17
    ? t('dashboard.greeting_afternoon')
    : t('dashboard.greeting_evening')

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">
          {greeting}, {user?.first_name || 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500 font-body mt-1">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Wellbeing concern banner */}
      {moodSummary?.wellbeing_concern && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 font-display">Wellbeing Alert</p>
            <p className="text-sm text-amber-700 font-body mt-0.5">{moodSummary.message}</p>
          </div>
          <Link to="/mental" className="ml-auto shrink-0 text-xs text-amber-700 font-semibold hover:underline">
            View →
          </Link>
        </div>
      )}

      {/* Vitals stats row */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 font-display uppercase tracking-wide mb-3">
          7-Day Averages
        </h2>
        {summaryLoading ? (
          <PageLoader />
        ) : summaryError ? (
          <Card className="text-center py-6">
            <p className="text-sm text-red-500 font-body">
              <button onClick={() => refetchSummary()} className="text-primary-700 underline text-xs">
                Retry
              </button>.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Avg Glucose"
              value={summary?.glucose?.average_mg_dl?.toFixed(0) ?? '—'}
              unit="mg/dL"
              subtitle={`${summary?.glucose.count ?? 0} readings`}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Avg Systolic"
              value={summary?.blood_pressure?.average_systolic?.toFixed(0) ?? '—'}
              unit="mmHg"
              subtitle={`${summary?.blood_pressure.count ?? 0} readings`}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Avg Diastolic"
              value={summary?.blood_pressure?.average_diastolic?.toFixed(0) ?? '—'}
              unit="mmHg"
              subtitle="Blood pressure"
            />
            <StatCard
              label="Mood Score"
              value={moodSummary?.average_mood_score?.toFixed(1) ?? '—'}
              unit="/ 10"
              subtitle={`${moodSummary?.entry_count ?? 0} entries`}
              icon={<Brain className="w-4 h-4" />}
            />
          </div>
        )}
      </section>

      {/* Risk Level Indicators */}
      {riskSummary && (
        <Card className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-3">
            Health Risk Assessment
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Glucose Risk',    risk: riskSummary.glucose?.risk_level },
              { label: 'BP Risk',         risk: riskSummary.blood_pressure?.risk_level },
              { label: 'Mood Risk',       risk: riskSummary.mood?.risk_level },
            ].map(({ label, risk }) => {
              const config = {
                LOW:     { color: 'bg-emerald-100 text-emerald-700', icon: <Minus className="w-3 h-3" />,          label: 'Low' },
                RISING:  { color: 'bg-amber-100 text-amber-700',     icon: <TrendingUp className="w-3 h-3" />,     label: 'Rising' },
                HIGH:    { color: 'bg-red-100 text-red-700',         icon: <AlertTriangle className="w-3 h-3" />,  label: 'High' },
                UNKNOWN: { color: 'bg-gray-100 text-gray-500',       icon: <Minus className="w-3 h-3" />,          label: 'Unknown' },
              }[risk] ?? { color: 'bg-gray-100 text-gray-500', icon: null, label: risk }

              return (
                <div key={label} className="text-center">
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-display ${config.color}`}>
                    {config.icon}
                    {config.label}
                  </div>
                  <p className="text-2xs text-gray-400 font-body mt-1">{label}</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 font-display uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map(({ to, Icon, label, desc, color }) => (
            <Link
              key={to} to={to}
              className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-150 hover:shadow-card-hover group ${color}`}
            >
              <div className="p-2 rounded-xl bg-white/60 w-fit">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold font-display">{label}</p>
                <p className="text-xs opacity-70 font-body mt-0.5">{desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity mt-auto self-end" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent triage */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 font-display uppercase tracking-wide">
            Latest Triage
          </h2>
          <Link to="/triage/history" className="text-xs text-primary-700 font-semibold hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {triageLoading ? (
          <PageLoader />
        ) : triageError ? (
          <Card className="text-center py-6">
            <p className="text-sm text-red-500 font-body">
              <button onClick={() => refetchTriage()} className="text-primary-700 underline text-xs">
                Retry
              </button>
            </p>
          </Card>
        ) : latestTriage ? (
          <Card className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="text-2xl shrink-0 mt-0.5">{URGENCY_ICON[latestTriage.urgency_level]}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UrgencyBadge level={latestTriage.urgency_level} />
                  <span className="text-xs text-gray-400 font-body">
                    {formatRelative(latestTriage.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-body leading-snug max-w-md">
                  {latestTriage.recommendation?.slice(0, 140) ?? 'No recommendation available'}
                </p>
                {latestTriage.matched_conditions?.length > 0 && (
                  <p className="text-xs text-gray-400 font-body mt-1">
                    Possible: {latestTriage.matched_conditions.map(c => c.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <Link to="/triage/history" className="shrink-0 text-xs text-primary-700 hover:underline font-semibold">
              Details
            </Link>
          </Card>
        ) : (
          <Card className="text-center py-8">
            <p className="text-sm text-gray-400 font-body">No triage sessions yet.</p>
            <Link to="/triage" className="mt-2 inline-block text-sm text-primary-700 font-semibold hover:underline">
              Start your first assessment →
            </Link>
          </Card>
        )}
      </section>

      {/* Mood breakdown */}
      {moodError ? (
        <Card className="text-center py-6">
          <p className="text-sm text-red-500 font-body">
            <button onClick={() => refetchMood()} className="text-primary-700 underline text-xs">
              Retry
            </button>
          </p>
        </Card>
      ) : !moodLoading && moodSummary && moodSummary.breakdown_by_category?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 font-display uppercase tracking-wide">
              Mood (14 days)
            </h2>
            <Link to="/mental" className="text-xs text-primary-700 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <Card className="flex flex-wrap gap-3">
            {moodSummary.breakdown_by_category.map(({ mood_category, count }) => (
              <div key={mood_category} className="flex items-center gap-2">
                <MoodBadge category={mood_category} />
                <span className="text-sm font-semibold text-gray-700 font-display">{count}×</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
