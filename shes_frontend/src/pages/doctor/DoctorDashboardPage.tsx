import { useQuery } from '@tanstack/react-query'
import { Users, Stethoscope, Activity, Brain } from 'lucide-react'
import { authApi } from '@/api/services'
import { Card, PageHeader, UrgencyBadge, PageLoader, EmptyState, StatCard } from '@/components/common'
import { formatDate } from '@/utils'

export default function DoctorDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-patients'],
    queryFn:  authApi.getDoctorPatients,
  })

  const patients = data?.results ?? []

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Patient Dashboard"
        subtitle="Overview of your assigned patients"
      />

      <div className="mb-6">
        <StatCard
          label="Assigned Patients"
          value={patients.length}
          icon={<Users className="w-4 h-4" />}
          subtitle="Active relationships"
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !patients.length ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No patients assigned"
          message="Patients will appear here once a relationship is established."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {patients.map((p: any) => (
            <PatientCard key={p.patient_id} patient={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function PatientCard({ patient }: { patient: any }) {
  const { data: summary } = useQuery({
    queryKey: ['doctor-patient-summary', patient.patient_id],
    queryFn:  () => authApi.getDoctorPatientSummary(patient.patient_id),
  })

  return (
    <Card className="space-y-3 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 font-display">{patient.patient_name}</p>
          <p className="text-xs text-gray-400 font-body">{patient.patient_email}</p>
          <p className="text-xs text-gray-400 font-body">{patient.county || 'Kenya'}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800 font-bold font-display">
          {patient.patient_name[0]}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 font-display">
              {summary.avg_glucose_mg_dl ?? '—'}
            </p>
            <p className="text-2xs text-gray-400 font-body">Avg Glucose</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 font-display">
              {summary.avg_systolic ? `${summary.avg_systolic}/${summary.avg_diastolic}` : '—'}
            </p>
            <p className="text-2xs text-gray-400 font-body">Avg BP</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 font-display">
              {summary.avg_mood_score ?? '—'}
            </p>
            <p className="text-2xs text-gray-400 font-body">Avg Mood</p>
          </div>
          <div className="text-center">
            {summary.latest_triage?.urgency_level ? (
              <UrgencyBadge level={summary.latest_triage.urgency_level} />
            ) : (
              <p className="text-lg font-bold text-gray-400 font-display">—</p>
            )}
            <p className="text-2xs text-gray-400 font-body mt-0.5">Last Triage</p>
          </div>
        </div>
      )}
    </Card>
  )
}