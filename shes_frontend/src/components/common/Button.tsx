/**
 * SHES Button Component
 * Supports variants: primary | secondary | ghost | danger
 * Supports sizes: sm | md | lg
 */
import React from 'react'
import { cn } from '@/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary-800 hover:bg-primary-700 text-white shadow-sm active:scale-[0.98]',
  secondary: 'bg-white hover:bg-surface-100 text-primary-900 border border-primary-200 shadow-sm active:scale-[0.98]',
  ghost:     'bg-transparent hover:bg-primary-50 text-primary-800',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-[0.98]',
  warning:   'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-[0.98]',
}

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md:  'px-4 py-2 text-sm gap-2 rounded-xl',
  lg:  'px-6 py-3 text-base gap-2 rounded-xl',
}

/**
 * Primary interactive button used throughout SHES.
 *
 * @example
 * <Button variant="primary" size="lg" onClick={handleSubmit}>
 *   Submit Symptoms
 * </Button>
 */
export function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-display font-medium',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
