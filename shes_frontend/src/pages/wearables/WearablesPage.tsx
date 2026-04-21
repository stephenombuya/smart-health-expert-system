/**
 * SHES Wearables Page
 * Connect and manage wearable devices.
 * View synced health metrics: steps, heart rate, sleep, weight.
 */
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Watch, RefreshCw, Zap, Moon, Heart,
  Footprints, Flame, Wifi,
  Plus, Trash2, TrendingUp, X,
} from 'lucide-react'
import { wearableApi } from '@/api/services'
import {
  Card, PageHeader, PageLoader, EmptyState,
} from '@/components/common'
import { Button } from '@/components/common/Button'
import { extractApiError } from '@/utils'

// Types
interface MetricData {
  average: number;
  min: number;
  max: number;
}

interface DashboardData {
  summary: Record<string, MetricData>;
  connected?: boolean;
}

interface Connection {
  provider: string;
  is_active: boolean;
  last_synced: string | null;
}

interface ManualEntry {
  metric: string;
  value: string;
  unit: string;
}

interface MetricConfig {
  label: string;
  icon: React.ReactNode;
  unit: string;
  color: string;
  bgColor: string;
  target?: number;
  lowerIsBetter?: boolean;
}

const METRIC_CONFIG: Record<string, MetricConfig> = {
  steps: {
    label: 'Daily Steps',
    icon: <Footprints className="w-4 h-4" />,
    unit: 'steps',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    target: 8000,
    lowerIsBetter: false,
  },
  heart_rate: {
    label: 'Heart Rate',
    icon: <Heart className="w-4 h-4" />,
    unit: 'bpm',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    target: 80,
    lowerIsBetter: true,
  },
  sleep_hours: {
    label: 'Sleep',
    icon: <Moon className="w-4 h-4" />,
    unit: 'hrs',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    target: 7,
    lowerIsBetter: false,
  },
  calories: {
    label: 'Calories',
    icon: <Flame className="w-4 h-4" />,
    unit: 'kcal',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    target: 2000,
    lowerIsBetter: false,
  },
  weight: {
    label: 'Weight',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: 'kg',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    target: 70,
    lowerIsBetter: true,
  },
  oxygen_sat: {
    label: 'Blood Oxygen',
    icon: <Zap className="w-4 h-4" />,
    unit: '%',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    target: 95,
    lowerIsBetter: false,
  },
}

// Helper function to calculate target percentage
const calculateTargetPercentage = (value: number, target: number, lowerIsBetter: boolean): number => {
  if (lowerIsBetter) {
    // For metrics where lower is better (heart rate, weight)
    // 0% = at or below target, 100% = double the target
    const percentage = Math.max(0, Math.min(100, Math.round(((value - target) / target) * 100)))
    return percentage
  } else {
    // For metrics where higher is better (steps, sleep, calories)
    return Math.min(100, Math.round((value / target) * 100))
  }
}

// Get color based on target percentage
const getProgressColor = (percentage: number, lowerIsBetter: boolean): string => {
  if (lowerIsBetter) {
    if (percentage <= 0) return 'bg-emerald-500'
    if (percentage <= 30) return 'bg-amber-400'
    return 'bg-red-400'
  } else {
    if (percentage >= 100) return 'bg-emerald-500'
    if (percentage >= 70) return 'bg-amber-400'
    return 'bg-red-400'
  }
}

// Manual Entry Modal Component (defined before usage)
const ManualEntryModal = ({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
}) => {
  const [entries, setEntries] = useState<ManualEntry[]>([
    { metric: 'steps', value: '', unit: 'steps' },
    { metric: 'heart_rate', value: '', unit: 'bpm' },
    { metric: 'sleep_hours', value: '', unit: 'hrs' },
    { metric: 'weight', value: '', unit: 'kg' },
    { metric: 'oxygen_sat', value: '', unit: '%' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleEntryChange = useCallback((index: number, value: string) => {
    setEntries(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], value }
      return updated
    })
  }, [])

  const validateValue = (value: number, metric: string): boolean => {
    if (isNaN(value) || value < 0) return false
    
    switch (metric) {
      case 'heart_rate':
        return value >= 30 && value <= 220
      case 'oxygen_sat':
        return value >= 50 && value <= 100
      case 'sleep_hours':
        return value <= 24
      case 'weight':
        return value >= 20 && value <= 300
      default:
        return value >= 0
    }
  }

  const handleSave = async () => {
    const validEntries = entries.filter(e => e.value.trim() !== '')
    
    if (!validEntries.length) {
      setError('Enter at least one value.')
      return
    }

    // Validate numeric ranges
    for (const entry of validEntries) {
      const numValue = parseFloat(entry.value)
      if (!validateValue(numValue, entry.metric)) {
        const cfg = METRIC_CONFIG[entry.metric]
        setError(`Invalid value for ${cfg?.label || entry.metric}. Please check the range.`)
        return
      }
    }

    setSaving(true)
    setError('')
    
    try {
      await wearableApi.logManual(
        validEntries.map(e => ({
          metric: e.metric,
          value: parseFloat(e.value),
          unit: e.unit,
          recorded_at: new Date().toISOString(),
        }))
      )
      onSuccess()
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setSaving(false)
    }
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="modal-title" className="text-base font-semibold text-gray-900 font-display">
            Log Wearable Data
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        <p className="text-xs text-gray-400 font-body mb-4">
          Enter today's readings from any device — Fitbit, Samsung Health, Apple Watch, etc.
        </p>

        {error && (
          <div 
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl"
            role="alert"
          >
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {entries.map((entry, index) => {
            const cfg = METRIC_CONFIG[entry.metric]
            if (!cfg) return null
            
            return (
              <div key={entry.metric} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bgColor}`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 font-display">
                    {cfg.label}
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={entry.value}
                    onChange={(e) => handleEntryChange(index, e.target.value)}
                    placeholder="0"
                    aria-label={`Enter ${cfg.label}`}
                    className="w-20 rounded-xl border border-gray-200 px-3 py-2
                               text-sm font-body text-center focus:outline-none
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    step={entry.metric === 'sleep_hours' ? '0.5' : '1'}
                  />
                  <span className="text-xs text-gray-400 font-body w-8">{entry.unit}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// Main Wearables Page Component
export default function WearablesPage() {
  const queryClient = useQueryClient()
  const [manualOpen, setManualOpen] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['wearable-dashboard'],
    queryFn: wearableApi.getDashboard,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: connections, isLoading: isConnectionsLoading } = useQuery<Connection[]>({
    queryKey: ['wearable-connections'],
    queryFn: wearableApi.getConnections,
    staleTime: 5 * 60 * 1000,
  })

  const syncMutation = useMutation({
    mutationFn: wearableApi.sync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wearable-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['wearable-connections'] })
      setSyncError('')
    },
    onError: (err) => setSyncError(extractApiError(err)),
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => wearableApi.disconnect(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wearable-connections'] })
      queryClient.invalidateQueries({ queryKey: ['wearable-dashboard'] })
    },
    onError: (err) => setSyncError(extractApiError(err)),
  })

  const connectGoogleFit = async () => {
    setIsConnecting(true)
    setSyncError('')
    
    try {
      const { auth_url } = await wearableApi.getGoogleFitAuthUrl()
      window.location.href = auth_url
    } catch (err) {
      setSyncError(extractApiError(err))
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (provider: string) => {
    if (window.confirm(`Are you sure you want to disconnect ${provider}?`)) {
      await disconnectMutation.mutateAsync(provider)
    }
  }

  const hasConnections = useMemo(() => 
    connections && connections.some(c => c.is_active), 
    [connections]
  )

  const isLoading = isDashboardLoading || isConnectionsLoading

  // Get the most recent sync time across all connections
  const lastSyncTime = useMemo(() => {
    if (!connections?.length) return null
    
    const syncTimes = connections
      .filter(c => c.last_synced)
      .map(c => new Date(c.last_synced!).getTime())
    
    if (syncTimes.length === 0) return null
    
    const mostRecent = new Date(Math.max(...syncTimes))
    return mostRecent
  }, [connections])

  const handleSync = useCallback(() => {
    if (!syncMutation.isPending) {
      syncMutation.mutate()
    }
  }, [syncMutation])

  const handleManualSuccess = useCallback(() => {
    setManualOpen(false)
    queryClient.invalidateQueries({ queryKey: ['wearable-dashboard'] })
  }, [queryClient])

  const summary = dashboard?.summary ?? {}

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Wearables"
        subtitle="Connect your device to sync health metrics automatically"
        action={
          hasConnections ? (
            <Button
              size="sm"
              variant="secondary"
              loading={syncMutation.isPending}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleSync}
              aria-label="Sync wearable data"
            >
              Sync Now
            </Button>
          ) : null
        }
      />

      {syncError && (
        <div 
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl"
          role="alert"
        >
          <p className="text-xs text-red-700 font-body">{syncError}</p>
        </div>
      )}

      {/* Connection Status */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Google Fit */}
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center
                           justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" fill="white"/>
              <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#34A853"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 font-display">
              Google Fit
            </p>
            <p className="text-xs text-gray-400 font-body">
              Steps, heart rate, sleep, calories
            </p>
          </div>
          {connections?.some(c => c.provider === 'google_fit' && c.is_active) ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-emerald-600">
                <Wifi className="w-4 h-4" aria-label="Connected" />
                <span className="text-xs font-semibold font-display">Connected</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDisconnect('google_fit')}
                aria-label="Disconnect Google Fit"
                loading={disconnectMutation.isPending}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              onClick={connectGoogleFit}
              loading={isConnecting}
              disabled={isConnecting}
            >
              Connect
            </Button>
          )}
        </Card>

        {/* Manual Entry */}
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center
                           justify-center shrink-0">
            <Watch className="w-6 h-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 font-display">
              Manual Entry
            </p>
            <p className="text-xs text-gray-400 font-body">
              Any wearable — enter data manually
            </p>
          </div>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => setManualOpen(true)}
            aria-label="Log manual data"
          >
            Log Data
          </Button>
        </Card>
      </div>

      {/* Metrics Dashboard */}
      {isLoading ? (
        <PageLoader />
      ) : !hasConnections && Object.keys(summary).length === 0 ? (
        <EmptyState
          icon={<Watch className="w-8 h-8" />}
          title="No wearable connected"
          message="Connect Google Fit or log data manually to see your health metrics here."
          action={
            <div className="flex gap-3 justify-center">
              <Button onClick={connectGoogleFit} leftIcon={<Plus className="w-4 h-4" />}>
                Connect Google Fit
              </Button>
              <Button variant="secondary" onClick={() => setManualOpen(true)}>
                Log Manually
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide
                         font-display mb-3">
            Last 7 Days Average
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {Object.entries(summary).map(([metric, data]) => {
              const cfg = METRIC_CONFIG[metric]
              if (!cfg || !data) return null
              
              const average = data.average ?? 0
              const target = cfg.target
              const percentage = target 
                ? calculateTargetPercentage(average, target, cfg.lowerIsBetter || false)
                : null
              const progressColor = percentage !== null && target
                ? getProgressColor(percentage, cfg.lowerIsBetter || false)
                : 'bg-gray-200'

              return (
                <Card key={metric} className="space-y-2">
                  <div className={`w-8 h-8 rounded-xl ${cfg.bgColor} flex items-center justify-center`}>
                    <span className={cfg.color}>{cfg.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xs text-gray-400 font-display uppercase tracking-wide">
                      {cfg.label}
                    </p>
                    <p className="text-xl font-bold text-gray-900 font-display">
                      {average.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ml-1">{cfg.unit}</span>
                    </p>
                    <p className="text-2xs text-gray-400 font-body">
                      Min {data.min ?? 0} · Max {data.max ?? 0}
                    </p>
                  </div>
                  {target && percentage !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs text-gray-400 font-body">
                          {percentage}% of target
                        </span>
                        <span className="text-2xs text-gray-400 font-body">
                          {target.toLocaleString()} {cfg.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${progressColor}`}
                          style={{ width: `${percentage}%` }}
                          role="progressbar"
                          aria-valuenow={percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Last sync info */}
          {lastSyncTime && (
            <div className="text-center">
              <p className="text-xs text-gray-400 font-body">
                Last synced: {lastSyncTime.toLocaleString('en-KE')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Manual Entry Modal */}
      {manualOpen && (
        <ManualEntryModal
          onClose={() => setManualOpen(false)}
          onSuccess={handleManualSuccess}
        />
      )}
    </div>
  )
}