/**
 * SHES Shared UI Primitives
 * Card | Badge | Spinner | EmptyState | ErrorMessage | PageHeader
 */
import React from 'react'
import { cn } from '@/utils'
import type { UrgencyLevel, MoodCategory } from '@/types'
import { URGENCY_COLORS, URGENCY_LABELS, URGENCY_DOT, MOOD_COLORS, MOOD_LABELS } from '@/utils'

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children:  React.ReactNode
  className?: string
  padding?:  'none' | 'sm' | 'md' | 'lg'
  hover?:    boolean
  onClick?:  () => void
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }

/**
 * Base card surface used throughout the dashboard.
 */
export function Card({ children, className, padding = 'md', hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-card',
        paddingMap[padding],
        hover && 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer',
        onClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-red-100 text-red-800',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium font-display',
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-semibold border font-display',
        URGENCY_COLORS[level],
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', URGENCY_DOT[level])} />
      {URGENCY_LABELS[level]}
    </span>
  )
}

// ─── Mood Badge ───────────────────────────────────────────────────────────────

export function MoodBadge({ category }: { category: MoodCategory }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full',
        'text-xs font-semibold font-display',
        MOOD_COLORS[category],
      )}
    >
      {MOOD_LABELS[category]}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }

const spinnerSizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-primary-600', spinnerSizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400 font-body">Loading…</p>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?:     React.ReactNode
  title:     string
  message?:  string
  action?:   React.ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 p-4 rounded-2xl bg-surface-100 text-primary-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700 font-display mb-1">{title}</h3>
      {message && <p className="text-sm text-gray-400 font-body max-w-xs">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── Error Message ────────────────────────────────────────────────────────────

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3 items-start animate-fade-in">
      <span className="text-red-500 text-lg shrink-0">⚠</span>
      <p className="text-sm text-red-700 font-body">{message}</p>
    </div>
  )
}

// ─── Success Message ──────────────────────────────────────────────────────────

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex gap-3 items-start animate-fade-in">
      <span className="text-emerald-500 text-lg shrink-0">✓</span>
      <p className="text-sm text-emerald-700 font-body">{message}</p>
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title:    string
  subtitle?: string
  action?:  React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 font-body">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:     string
  value:     string | number
  unit?:     string
  subtitle?: string
  trend?:    'up' | 'down' | 'neutral'
  icon?:     React.ReactNode
  className?: string
}

export function StatCard({ label, value, unit, subtitle, icon, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 font-display uppercase tracking-wide">{label}</span>
        {icon && <span className="text-primary-400">{icon}</span>}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-gray-900 font-display leading-none">{value}</span>
        {unit && <span className="text-sm text-gray-500 font-body mb-0.5">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-gray-400 font-body">{subtitle}</p>}
    </Card>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open:      boolean
  onClose:   () => void
  title?:    string
  children:  React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

const maxWidthMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl animate-slide-up',
          maxWidthMap[maxWidth],
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 font-display">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
