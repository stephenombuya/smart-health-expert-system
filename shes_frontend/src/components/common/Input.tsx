/**
 * SHES Form Input Components
 * Input | Textarea | Select – all support label, error, helper text
 */
import React from 'react'
import { cn } from '@/utils'

// ─── Base input styles ────────────────────────────────────────────────────────

const baseInput = [
  'w-full rounded-xl border px-3.5 py-2.5 text-sm font-body',
  'bg-white text-gray-900 placeholder-gray-400',
  'transition-colors duration-150',
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:border-transparent',
  'disabled:bg-surface-100 disabled:cursor-not-allowed disabled:text-gray-500',
].join(' ')

const borderNormal = 'border-gray-200'
const borderError  = 'border-red-400 focus:ring-red-400'

// ─── Wrapper ──────────────────────────────────────────────────────────────────

interface FieldWrapperProps {
  label?:    string
  htmlFor?:  string
  error?:    string
  helper?:   string
  required?: boolean
  children:  React.ReactNode
  className?: string
}

function FieldWrapper({ label, htmlFor, error, helper, required, children, className }: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 font-display">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error  && <p className="text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}
      {helper && !error && <p className="text-xs text-gray-400">{helper}</p>}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  helper?:   string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
  wrapperClassName?: string
}

/**
 * Labelled text input with optional addons and validation display.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftAddon, rightAddon, wrapperClassName, className, ...props }, ref) => (
    <FieldWrapper
      label={label}
      htmlFor={props.id}
      error={error}
      helper={helper}
      required={props.required}
      className={wrapperClassName}
    >
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="absolute left-3.5 text-gray-400 pointer-events-none">{leftAddon}</span>
        )}
        <input
          ref={ref}
          className={cn(
            baseInput,
            error ? borderError : borderNormal,
            leftAddon  && 'pl-10',
            rightAddon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightAddon && (
          <span className="absolute right-3.5 text-gray-400">{rightAddon}</span>
        )}
      </div>
    </FieldWrapper>
  )
)
Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string
  error?:  string
  helper?: string
  wrapperClassName?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, wrapperClassName, className, ...props }, ref) => (
    <FieldWrapper
      label={label}
      htmlFor={props.id}
      error={error}
      helper={helper}
      required={props.required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        rows={4}
        className={cn(
          baseInput, 'resize-y min-h-[80px]',
          error ? borderError : borderNormal,
          className
        )}
        {...props}
      />
    </FieldWrapper>
  )
)
Textarea.displayName = 'Textarea'

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectOption { value: string; label: string }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string
  error?:    string
  helper?:   string
  options:   SelectOption[]
  placeholder?: string
  wrapperClassName?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, options, placeholder, wrapperClassName, className, ...props }, ref) => (
    <FieldWrapper
      label={label}
      htmlFor={props.id}
      error={error}
      helper={helper}
      required={props.required}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        className={cn(
          baseInput, 'appearance-none cursor-pointer',
          error ? borderError : borderNormal,
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldWrapper>
  )
)
Select.displayName = 'Select'
