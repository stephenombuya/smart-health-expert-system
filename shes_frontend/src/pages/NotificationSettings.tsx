// src/pages/NotificationSettings.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Shield, Pill, Calendar, Activity,
  Brain, Mail, Smartphone, MessageSquare, MonitorSmartphone,
  ChevronLeft, RotateCcw, Save, Lock, Info,
  AlertTriangle, CheckCircle2, Moon,
} from 'lucide-react'
import { cn } from '@/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelPrefs {
  email: boolean
  push: boolean
  sms: boolean
  in_app: boolean
}

interface NotificationCategory {
  id: string
  label: string
  description: string
  mandatory: boolean
  channels: ChannelPrefs
  enabled: boolean
}

interface QuietHours {
  enabled: boolean
  start: string // "22:00"
  end: string   // "07:00"
}

interface NotificationSettings {
  categories: NotificationCategory[]
  quiet_hours: QuietHours
}

// ─── Smart Defaults ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: NotificationSettings = {
  categories: [
    {
      id: 'critical_health',
      label: 'Critical Health Alerts',
      description: 'Abnormal lab results, drug interactions, emergency recommendations, and patient safety alerts.',
      mandatory: true,
      enabled: true,
      channels: { email: true, push: true, sms: true, in_app: true },
    },
    {
      id: 'medication',
      label: 'Medication Management',
      description: 'Reminders for taking medication, refill alerts, and dosage changes.',
      mandatory: false,
      enabled: true,
      channels: { email: false, push: true, sms: true, in_app: true },
    },
    {
      id: 'appointments',
      label: 'Appointment Management',
      description: 'Upcoming appointments, telemedicine links, and follow-up reminders.',
      mandatory: false,
      enabled: true,
      channels: { email: true, push: true, sms: false, in_app: true },
    },
    {
      id: 'chronic',
      label: 'Chronic Condition Monitoring',
      description: 'Blood pressure readings, glucose level alerts, and weight tracking reminders.',
      mandatory: false,
      enabled: true,
      channels: { email: false, push: true, sms: false, in_app: true },
    },
    {
      id: 'mental_health',
      label: 'Mental Health Support',
      description: 'Mood tracking prompts, coping strategy suggestions, and wellness check-ins.',
      mandatory: false,
      enabled: true,
      channels: { email: false, push: true, sms: false, in_app: true },
    },
    {
      id: 'promotional',
      label: 'Tips & Updates',
      description: 'Health tips, feature announcements, and general wellness content.',
      mandatory: false,
      enabled: true,
      channels: { email: false, push: false, sms: false, in_app: true },
    },
  ],
  quiet_hours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
}

// ─── Channel config ───────────────────────────────────────────────────────────

const CHANNELS: { key: keyof ChannelPrefs; label: string; Icon: React.ElementType; desc: string }[] = [
  { key: 'in_app',  label: 'In-App',  Icon: MonitorSmartphone, desc: 'All notifications' },
  { key: 'push',    label: 'Push',    Icon: Smartphone,        desc: 'Daily reminders' },
  { key: 'email',   label: 'Email',   Icon: Mail,              desc: 'Non-urgent updates' },
  { key: 'sms',     label: 'SMS',     Icon: MessageSquare,     desc: 'Critical only' },
]

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  critical_health: Shield,
  medication:      Pill,
  appointments:    Calendar,
  chronic:         Activity,
  mental_health:   Brain,
  promotional:     Bell,
}

const CATEGORY_COLORS: Record<string, string> = {
  critical_health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medication:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  appointments:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  chronic:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  mental_health:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  promotional:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        size === 'md' ? 'h-6 w-11' : 'h-5 w-9',
        checked
          ? disabled
            ? 'bg-primary-300 dark:bg-primary-700 cursor-not-allowed'
            : 'bg-primary-600 cursor-pointer'
          : disabled
            ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
            : 'bg-gray-300 dark:bg-gray-600 cursor-pointer',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow transform transition duration-200 ease-in-out',
          size === 'md' ? 'h-5 w-5' : 'h-4 w-4',
          checked
            ? size === 'md' ? 'translate-x-5' : 'translate-x-4'
            : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ─── Channel Chip ─────────────────────────────────────────────────────────────

function ChannelChip({
  channel,
  checked,
  onChange,
  disabled,
}: {
  channel: typeof CHANNELS[number]
  checked: boolean
  onChange: (v: boolean) => void
  disabled: boolean
}) {
  const { Icon, label } = channel
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
        checked && !disabled
          ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-400'
          : checked && disabled
            ? 'bg-primary-50 border-primary-200 text-primary-400 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-600 cursor-not-allowed'
            : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400',
        !disabled && 'hover:border-primary-300 cursor-pointer',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {checked && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
    </button>
  )
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({
  category,
  onToggleEnabled,
  onToggleChannel,
}: {
  category: NotificationCategory
  onToggleEnabled: (id: string, val: boolean) => void
  onToggleChannel: (id: string, ch: keyof ChannelPrefs, val: boolean) => void
}) {
  const Icon = CATEGORY_ICONS[category.id] ?? Bell
  const colorClass = CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.promotional
  const isDisabled = !category.enabled || category.mandatory

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      category.mandatory
        ? 'border-red-200 bg-red-50/30 dark:border-red-800/40 dark:bg-red-900/10'
        : category.enabled
          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-70',
    )}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', colorClass)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white font-display">
                  {category.label}
                </h4>
                {category.mandatory && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wide">
                    <Lock className="w-2.5 h-2.5" />
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-body mt-0.5 leading-relaxed">
                {category.description}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {category.mandatory && (
              <span className="text-xs text-red-500 dark:text-red-400 hidden sm:block">Always on</span>
            )}
            <Toggle
              checked={category.enabled}
              onChange={(v) => onToggleEnabled(category.id, v)}
              disabled={category.mandatory}
            />
          </div>
        </div>

        {/* Channels */}
        <div className="mt-3 pl-12 flex flex-wrap gap-2">
          {CHANNELS.map((ch) => (
            <ChannelChip
              key={ch.key}
              channel={ch}
              checked={category.channels[ch.key]}
              disabled={isDisabled}
              onChange={(v) => onToggleChannel(category.id, ch.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function NotificationSettings() {
  const navigate = useNavigate()
//   const qc = useQueryClient()
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  // In production, fetch from API:
  // const { data } = useQuery({ queryKey: ['notification-settings'], queryFn: authApi.getNotificationSettings })
  // useEffect(() => { if (data) setSettings(data) }, [data])

  const handleToggleEnabled = (id: string, val: boolean) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, enabled: val } : c),
    }))
    setSaved(false)
  }

  const handleToggleChannel = (id: string, ch: keyof ChannelPrefs, val: boolean) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === id ? { ...c, channels: { ...c.channels, [ch]: val } } : c
      ),
    }))
    setSaved(false)
  }

  const handleQuietHours = (patch: Partial<QuietHours>) => {
    setSettings(prev => ({ ...prev, quiet_hours: { ...prev.quiet_hours, ...patch } }))
    setSaved(false)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    setSaved(false)
  }

  const handleSave = () => {
    // In production: saveMutation.mutate(settings)
    console.log('Saving notification settings:', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            Notification Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-body mt-0.5">
            Manage how and when SHES contacts you
          </p>
        </div>
      </div>

      {/* Safety notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 mb-6">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 font-display">
            Critical alerts cannot be disabled
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 font-body mt-0.5">
            For your safety, critical health alerts (abnormal results, drug interactions, emergencies) are always active on all channels and cannot be turned off.
          </p>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 font-body mb-3">
          Notification Categories
        </h2>
        <div className="space-y-3">
          {settings.categories.map(cat => (
            <CategoryRow
              key={cat.id}
              category={cat}
              onToggleEnabled={handleToggleEnabled}
              onToggleChannel={handleToggleChannel}
            />
          ))}
        </div>
      </section>

      {/* Channel legend */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 font-body mb-3">
          Channel Guide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CHANNELS.map(({ key, label, Icon, desc }) => (
            <div key={key} className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 font-display">{label}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-body">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 font-body mb-3">
          Quiet Hours
        </h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white font-display">
                  Enable Quiet Hours
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-body mt-0.5">
                  Suppress non-critical notifications during sleep. Critical health alerts always bypass quiet hours.
                </p>
              </div>
            </div>
            <Toggle
              checked={settings.quiet_hours.enabled}
              onChange={(v) => handleQuietHours({ enabled: v })}
            />
          </div>

          {settings.quiet_hours.enabled && (
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-body w-12">From</label>
                  <input
                    type="time"
                    value={settings.quiet_hours.start}
                    onChange={(e) => handleQuietHours({ start: e.target.value })}
                    className="text-sm font-medium text-gray-800 dark:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-body w-12">To</label>
                  <input
                    type="time"
                    value={settings.quiet_hours.end}
                    onChange={(e) => handleQuietHours({ end: e.target.value })}
                    className="text-sm font-medium text-gray-800 dark:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-body mt-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Critical health alerts will still come through during quiet hours.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to defaults
        </button>

        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white',
          )}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save preferences</>
          )}
        </button>
      </div>
    </div>
  )
}