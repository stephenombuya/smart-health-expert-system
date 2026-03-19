/**
 * SHES Verify Email Page
 * User arrives here from the link in their verification email:
 * http://localhost:3000/verify-email?token=<token>
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, RefreshCw, Heart } from 'lucide-react'
import { authApi } from '@/api/services'
import { Button } from '@/components/common/Button'
import { Spinner } from '@/components/common'
import { extractApiError } from '@/utils'

type State = 'loading' | 'success' | 'already_verified' | 'error' | 'no_token'

export default function VerifyEmailPage() {
  const [searchParams]    = useSearchParams()
  const token             = searchParams.get('token') ?? ''
  const [state, setState] = useState<State>(token ? 'loading' : 'no_token')
  const [errorMsg, setErrorMsg] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (!token || called.current) return
    called.current = true

    authApi.verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        const msg = extractApiError(err)
        if (msg.toLowerCase().includes('already')) {
          setState('already_verified')
        } else {
          setErrorMsg(msg)
          setState('error')
        }
      })
  }, [token])

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-sm text-center animate-slide-up">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-800 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
        </div>
        {children}
      </div>
    </div>
  )

  if (state === 'loading') {
    return (
      <Wrapper>
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500 font-body">Verifying your email…</p>
        </div>
      </Wrapper>
    )
  }

  if (state === 'no_token') {
    return (
      <Wrapper>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 font-display mb-2">
          Invalid Verification Link
        </h1>
        <p className="text-sm text-gray-500 font-body mb-6">
          This link is missing a verification token. Please use the exact link from your email.
        </p>
        <Link to="/login">
          <Button fullWidth variant="secondary">Back to Sign In</Button>
        </Link>
      </Wrapper>
    )
  }

  if (state === 'success') {
    return (
      <Wrapper>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
          Email Verified! 🎉
        </h1>
        <p className="text-sm text-gray-500 font-body mb-8">
          Your email address has been verified. Your SHES account is now fully activated.
        </p>
        <Link to="/login">
          <Button fullWidth size="lg">Sign In to SHES</Button>
        </Link>
      </Wrapper>
    )
  }

  if (state === 'already_verified') {
    return (
      <Wrapper>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-5">
          <CheckCircle2 className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 font-display mb-2">Already Verified</h1>
        <p className="text-sm text-gray-500 font-body mb-8">
          Your email address is already verified. You can sign in normally.
        </p>
        <Link to="/login">
          <Button fullWidth variant="secondary">Sign In</Button>
        </Link>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-5">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 font-display mb-2">
        Verification Failed
      </h1>
      <p className="text-sm text-gray-500 font-body mb-2">
        {errorMsg || 'This verification link is invalid or has expired.'}
      </p>
      <p className="text-xs text-gray-400 font-body mb-8">
        Verification links expire after 24 hours. Sign in and request a new one.
      </p>
      <div className="space-y-3">
        <Link to="/login">
          <Button fullWidth leftIcon={<RefreshCw className="w-4 h-4" />}>
            Sign In & Resend Verification
          </Button>
        </Link>
        <Link to="/login">
          <Button fullWidth variant="secondary">Back to Sign In</Button>
        </Link>
      </div>
    </Wrapper>
  )
}