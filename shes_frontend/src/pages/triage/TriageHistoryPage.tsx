/**
 * SHES Triage History Page
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Stethoscope, ChevronDown, ChevronUp } from 'lucide-react'
import { triageApi } from '@/api/services'
import { Card, PageHeader, UrgencyBadge, PageLoader, EmptyState } from '@/components/common'
import { Button } from '@/components/common/Button'
import { Pagination } from '@/components/common/Pagination'
import { formatDateTime, URGENCY_ICON } from '@/utils'
import type { TriageSession, UrgencyLevel } from '@/types'

const FILTERS: Array<{ label: string; value: UrgencyLevel | 'all' }> = [
  { label: 'All',          value: 'all' },
  { label: '🚨 Emergency', value: 'emergency' },
  { label: '🩺 Doctor',    value: 'doctor_visit' },
  { label: '🏠 Self-Care', value: 'self_care' },
]

function SessionCard({ session }: { session: TriageSession }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{URGENCY_ICON[session.urgency_level]}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <UrgencyBadge level={session.urgency_level} />
              <span className="text-xs text-gray-400 font-body">{formatDateTime(session.created_at)}</span>
            </div>
            <p className="text-sm text-gray-600 font-body">
              {session.symptoms.length} symptom{session.symptoms.length !== 1 ? 's' : ''}
              {session.matched_conditions.length > 0 && ` · Possible: ${session.matched_conditions.map(c => c.name).join(', ')}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-gray-100 space-y-3 animate-fade-in">
          <p className="text-sm text-gray-700 font-body leading-relaxed">{session.recommendation}</p>
          {session.layman_explanation && (
            <p className="text-sm text-gray-500 font-body leading-relaxed italic">{session.layman_explanation}</p>
          )}
          {session.symptoms.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide font-display mb-2">Symptoms</p>
              <div className="flex flex-wrap gap-2">
                {session.symptoms.map(s => (
                  <span key={s.id} className="px-2.5 py-1 bg-surface-100 rounded-lg text-xs text-gray-600 font-body">
                    {s.name} <span className="text-gray-400">({s.severity}/10)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {session.red_flags_detected.length > 0 && (
            <div className="bg-red-50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 font-display mb-1">Red Flags</p>
              <p className="text-sm text-red-600 font-body">{session.red_flags_detected.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function TriageHistoryPage() {
  const [page, setPage]     = useState(1)
  const [filter, setFilter] = useState<UrgencyLevel | 'all'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['triage-history', page, filter],
    queryFn:  () => triageApi.getHistory(page),
  })

  // Client-side filter (backend doesn't support urgency filter yet)
  const results = filter === 'all'
    ? (data?.results ?? [])
    : (data?.results ?? []).filter(s => s.urgency_level === filter)

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Triage History"
        subtitle="Your past symptom assessments"
        action={
          <Link to="/triage">
            <Button size="sm" leftIcon={<Stethoscope className="w-4 h-4" />}>New Triage</Button>
          </Link>
        }
      />

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium font-display transition-all duration-150 ${
              filter === f.value
                ? 'bg-primary-800 text-white'
                : 'bg-surface-100 text-gray-600 hover:bg-primary-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !results.length ? (
        <EmptyState
          icon={<Stethoscope className="w-8 h-8" />}
          title="No sessions found"
          message={filter !== 'all' ? 'Try a different filter.' : 'Start your first symptom assessment.'}
          action={<Link to="/triage"><Button>Start Assessment</Button></Link>}
        />
      ) : (
        <>
          <div className="space-y-3">
            {results.map(session => <SessionCard key={session.id} session={session} />)}
          </div>
          <Pagination
            count={data?.count ?? 0}
            currentPage={page}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}