/**
 * SHES Wearables Page
 * Connect and manage wearable devices.
 * View synced health metrics: steps, heart rate, sleep, weight.
 */
import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Watch, RefreshCw, Zap, Moon, Heart,
  Footprints, Flame, Wifi,
  Plus, TrendingUp, X,
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

// FIX 1: Removed unused ConnectionCardProps interface (it was duplicated/incomplete and
// never used — the actual props are inlined on the component itself below).

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
    const percentage = Math.max(0, Math.min(100, Math.round(((value - target) / target) * 100)))
    return percentage
  } else {
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

// Icon Components
function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  )
}

function FitbitIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#00B0B9"/>
      <circle cx="12" cy="7"  r="2" fill="white"/>
      <circle cx="12" cy="12" r="2" fill="white"/>
      <circle cx="12" cy="17" r="2" fill="white"/>
      <circle cx="7"  cy="12" r="1.5" fill="white"/>
      <circle cx="17" cy="12" r="1.5" fill="white"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="24" viewBox="0 0 814 1000" fill="currentColor"
         className="text-gray-800 dark:text-gray-200">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-148.2-93.9C92 388.4 92 332.2 92 324.6c0-129.5 90.4-197.6 179.7-197.6 47.7 0 87.4 31.4 116.6 31.4 27.7 0 71.7-33.3 128.4-33.3 20.4 0 128.4 1.9 196.5 90.5zm-234.8-165.6C594.2 71.1 644.2 27 694 27c7.1 72.3-20.4 146.6-66.4 200.1-45.4 54.8-120.2 97.1-190.3 92.6-8.9-69.1 25.8-148.5 75.9-200.4z"/>
    </svg>
  )
}

// FIX 2: ConnectionCard had a broken prop signature — the props interface at the top
// (ConnectionCardProps) was incomplete and never used; the component re-declared its own
// inline props but was missing `isConnecting` in the destructuring even though it was
// referenced in JSX. Added `isConnecting` to the destructure list.
function ConnectionCard({
  icon, title, badge, subtitle, connected, lastSynced,
  onConnect, isConnecting, onSync, syncing, actionLabel = 'Connect',
  onDisconnect, isDisconnecting,
}: {
  icon:              React.ReactNode
  title:             string
  badge?:            string
  subtitle:          string
  connected:         boolean
  lastSynced?:       string | null
  onConnect:         () => void
  isConnecting?:     boolean
  onSync?:           () => void
  syncing?:          boolean
  actionLabel?:      string
  onDisconnect?:     () => void
  isDisconnecting?:  boolean
}) {
  return (
    <div className="
      rounded-2xl border p-4 flex items-start gap-3
      bg-white dark:bg-gray-900
      border-gray-100 dark:border-gray-800
      shadow-sm
    ">
      <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-display">
            {title}
          </p>
          {badge && (
            <span className="
              px-2 py-0.5 rounded-full text-2xs font-semibold font-display
              bg-gray-100 dark:bg-gray-800
              text-gray-500 dark:text-gray-400
            ">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-body mt-0.5 leading-relaxed">
          {subtitle}
        </p>
        {connected && lastSynced && (
          <p className="text-2xs text-gray-400 dark:text-gray-600 font-body mt-1">
            Last synced: {new Date(lastSynced).toLocaleString('en-KE')}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {/* FIX 3: The original rendered the connect/sync/disconnect buttons ONLY when
            `connected` was true, so unconnected cards (Manual, Apple Health when not yet
            connected) never showed their action button. Moved the action button outside
            the `connected` guard so it always renders. */}
        <div className="flex flex-col items-end gap-1.5">
          {connected && (
            <div className="flex items-center gap-1 text-emerald-600">
              <Wifi className="w-4 h-4" />
              <span className="text-xs font-semibold">Connected</span>
            </div>
          )}
          <div className="flex gap-2 items-center">
            {connected && onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="text-2xs text-gray-500 hover:underline"
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            )}
            {connected && onDisconnect && (
              <button
                onClick={onDisconnect}
                disabled={isDisconnecting}
                className="text-2xs text-red-600 hover:underline"
              >
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            )}
            {/* FIX 4: The original wrapped the connect Button in `connected && ...`
                which meant it never appeared for unconnected cards. Now it renders when
                NOT connected (or always for cards like Apple Health / Manual that use
                onConnect to open a modal regardless of connection state). */}
            {!connected && (
              <Button
                size="sm"
                onClick={onConnect}
                loading={isConnecting}
                disabled={isConnecting}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Manual Entry Modal Component
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
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100 font-display">
            Log Wearable Data
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            role="alert"
          >
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {entries.map((entry, index) => {
            const cfg = METRIC_CONFIG[entry.metric]
            if (!cfg) return null

            return (
              <div key={entry.metric} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bgColor} dark:bg-opacity-20`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-display">
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
                    className="w-20 rounded-xl border border-gray-200 dark:border-gray-700
                               bg-white dark:bg-gray-800 px-3 py-2
                               text-sm font-body text-center focus:outline-none
                               focus:ring-2 focus:ring-primary-500 focus:border-transparent
                               dark:text-gray-100"
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

function AppleHealthImportModal({
  onClose, onSuccess,
}: { onClose: () => void; onSuccess: (count: number) => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const fileRef               = useRef<HTMLInputElement>(null)

  const handleImport = async () => {
    if (!file) { setError('Please select your export.zip file.'); return }
    setLoading(true)
    try {
      const result = await wearableApi.importAppleHealth(file)
      onSuccess(result.saved)
    } catch (err: any) {
      setError(extractApiError(err) || 'Import failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="
        w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-slide-up
        bg-white dark:bg-gray-900
        border border-gray-100 dark:border-gray-800
      ">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <AppleIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-display">
              Import Apple Health Data
            </h3>
            <p className="text-2xs text-gray-400 dark:text-gray-500 font-body">
              iPhone export.zip → SHES
            </p>
          </div>
        </div>

        <div className="
          bg-blue-50 dark:bg-blue-900/20
          border border-blue-200 dark:border-blue-800
          rounded-xl p-3 mb-4
        ">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 font-display mb-2">
            How to export from your iPhone:
          </p>
          <ol className="space-y-1">
            {[
              'Open the Health app on your iPhone',
              'Tap your profile photo (top right)',
              'Tap "Export All Health Data"',
              'Tap "Export" and choose how to share',
              'AirDrop or email the export.zip to yourself',
              'Upload it here',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="
                  w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800
                  text-blue-800 dark:text-blue-200
                  text-2xs font-bold flex items-center justify-center shrink-0 mt-0.5
                ">
                  {i + 1}
                </span>
                <span className="text-2xs text-blue-700 dark:text-blue-300 font-body">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={e => {
            setFile(e.target.files?.[0] ?? null)
            setError('')
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="
            w-full border-2 border-dashed rounded-xl p-4 mb-4 text-center
            border-gray-200 dark:border-gray-700
            hover:border-primary-400 dark:hover:border-primary-600
            transition-colors cursor-pointer
          "
        >
          {file ? (
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-display">
                {file.name}
              </p>
              <p className="text-2xs text-gray-400 dark:text-gray-500 font-body">
                {(file.size / (1024 * 1024)).toFixed(1)} MB — ready to import
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-body">
                Click to select export.zip
              </p>
              <p className="text-2xs text-gray-400 dark:text-gray-600 font-body mt-1">
                Maximum 100MB
              </p>
            </div>
          )}
        </button>

        {error && (
          <div className="
            mb-4 p-3 rounded-xl
            bg-red-50 dark:bg-red-900/20
            border border-red-200 dark:border-red-800
          ">
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth loading={loading} onClick={handleImport} disabled={!file}>
            Import Health Data
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

  // FIX 5: `appleImportOpen` was used to show an inline duplicate modal instead of the
  // purpose-built `AppleHealthImportModal` component defined above it. Replaced the
  // inline modal in JSX with `<AppleHealthImportModal>` so the proper component is used.
  const [appleImportOpen, setAppleImportOpen] = useState(false)

  const connectFitbit = async () => {
    try {
      const { auth_url } = await wearableApi.getFitbitAuthUrl()
      window.location.href = auth_url
    } catch (err: any) {
      setSyncError(extractApiError(err))
    }
  }

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['wearable-dashboard'],
    queryFn: wearableApi.getDashboard,
    staleTime: 5 * 60 * 1000,
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

  // FIX 6: All three `onDisconnect` handlers for Google Fit, Fitbit, and Apple Health
  // were hardcoded to 'google_fit'. Each now passes its own correct provider string.
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

  // FIX 7: Added handler for Apple Health import success so it closes the modal and
  // refreshes queries, consistent with how other connection flows work.
  const handleAppleImportSuccess = useCallback((_count: number) => {
    setAppleImportOpen(false)
    queryClient.invalidateQueries({ queryKey: ['wearable-connections'] })
    queryClient.invalidateQueries({ queryKey: ['wearable-dashboard'] })
  }, [queryClient])

  const summary = dashboard?.summary ?? {}

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
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
          className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          role="alert"
        >
          <p className="text-xs text-red-700 dark:text-red-400 font-body">{syncError}</p>
        </div>
      )}

      {/* Connected devices */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Google Fit — Android */}
        <ConnectionCard
          icon={<GoogleIcon />}
          title="Google Fit"
          badge="Android"
          subtitle="Pixel Watch · Samsung Galaxy Watch · Xiaomi Mi Band → via Android"
          connected={!!connections?.find((c: Connection) => c.provider === 'google_fit' && c.is_active)}
          lastSynced={connections?.find((c: Connection) => c.provider === 'google_fit')?.last_synced}
          onConnect={connectGoogleFit}
          isConnecting={isConnecting}
          onSync={() => syncMutation.mutate()}
          syncing={syncMutation.isPending}
          onDisconnect={() => handleDisconnect('google_fit')}
          isDisconnecting={disconnectMutation.isPending}
        />

        {/* Fitbit */}
        <ConnectionCard
          icon={<FitbitIcon />}
          title="Fitbit"
          badge="Watch"
          subtitle="Charge · Versa · Sense · Inspire · Luxe series"
          connected={!!connections?.find((c: Connection) => c.provider === 'fitbit' && c.is_active)}
          lastSynced={connections?.find((c: Connection) => c.provider === 'fitbit')?.last_synced}
          onConnect={connectFitbit}
          onSync={() => syncMutation.mutate()}
          syncing={syncMutation.isPending}
          onDisconnect={() => handleDisconnect('fitbit')}
          isDisconnecting={disconnectMutation.isPending}
        />

        {/* Apple Health — iPhone */}
        <ConnectionCard
          icon={<AppleIcon />}
          title="Apple Health"
          badge="iPhone"
          subtitle="iPhone → Health app → Export All Health Data → upload ZIP here"
          connected={!!connections?.find((c: Connection) => c.provider === 'apple_health' && c.is_active)}
          lastSynced={connections?.find((c: Connection) => c.provider === 'apple_health')?.last_synced}
          onConnect={() => setAppleImportOpen(true)}
          actionLabel="Import ZIP"
          onDisconnect={() => handleDisconnect('apple_health')}
          isDisconnecting={disconnectMutation.isPending}
        />

        {/* Manual entry */}
        <ConnectionCard
          icon={<Watch className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
          title="Any Device"
          badge="Manual"
          subtitle="Garmin · Samsung Health · Xiaomi · any fitness app — enter data manually"
          connected={false}
          onConnect={() => setManualOpen(true)}
          actionLabel="Log Data"
        />
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
                  <div className={`w-8 h-8 rounded-xl ${cfg.bgColor} dark:bg-opacity-20 flex items-center justify-center`}>
                    <span className={cfg.color}>{cfg.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xs text-gray-400 font-display uppercase tracking-wide">
                      {cfg.label}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 font-display">
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
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
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

      {/* FIX 5 (cont): Replaced the duplicate inline modal with the proper
          AppleHealthImportModal component that was already defined but never used. */}
      {appleImportOpen && (
        <AppleHealthImportModal
          onClose={() => setAppleImportOpen(false)}
          onSuccess={handleAppleImportSuccess}
        />
      )}
    </div>
  )
}