/**
 * SHES Email Verification Banner
 * Shown at the top of every authenticated page when email is not verified.
 */
import { useState } from 'react'
import { Mail, X, CheckCircle2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/api/services'

export function EmailVerificationBanner() {
  const { user, refreshUser }   = useAuth()
  const [dismissed, setDismiss] = useState(false)
  const [resent, setResent]     = useState(false)

  const resendMutation = useMutation({
    mutationFn: authApi.resendVerificationEmail,
    onSuccess: async () => {
      await refreshUser()
      setResent(true)
    },
  })

  if (!user || user.is_email_verified || dismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 animate-fade-in">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 p-1.5 rounded-lg bg-amber-100">
            <Mail className="w-4 h-4 text-amber-700" />
          </div>

          {resent ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-body text-emerald-700">
                Verification email sent — check your inbox
                <span className="ml-1 text-amber-600">
                  (dev mode: check the Django terminal)
                </span>
              </p>
            </div>
          ) : (
            <p className="text-xs font-body text-amber-800 truncate">
              <span className="font-semibold">Verify your email</span>
              {' '}— check your inbox for the link we sent to{' '}
              <span className="font-semibold">{user.email}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!resent && (
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900
                         underline underline-offset-2 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed font-display"
            >
              {resendMutation.isPending ? 'Sending…' : 'Resend email'}
            </button>
          )}
          <button
            onClick={() => setDismiss(true)}
            className="p-1 rounded-lg text-amber-500 hover:bg-amber-100 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}