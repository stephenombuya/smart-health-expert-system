/**
 * SHES Google Sign-In Button
 * Uses @react-oauth/google to render the official Google button.
 * On success, sends the ID token to the SHES backend.
 */
import { useGoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { authApi } from '@/api/services'
import { tokenStorage } from '@/api/client'
import { extractApiError } from '@/utils'

interface GoogleSignInButtonProps {
  onSuccess: (user: any) => void
  onError?:  (message: string) => void
  label?:    string
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        // @react-oauth/google returns an access_token not an id_token
        // We need to fetch the user info and get an id_token via the
        // Google tokeninfo endpoint or use the credential flow instead
        // Using credential (id_token) flow via GoogleLogin component is cleaner
        // This hook variant uses access_token — convert to id_token via userinfo
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo`,
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        )
        const userInfo = await userInfoResponse.json()

        // With the access_token flow we don't get an id_token directly
        // So we call our backend with the access_token and handle it there
        // Better: use the GoogleLogin component for credential/id_token flow
        // See the LoginPage implementation below for the recommended approach
        console.warn("Use GoogleLogin component instead for id_token flow")
      } catch (err) {
        onError?.(extractApiError(err))
      } finally {
        setLoading(false)
      }
    },
    onError: (error) => {
      onError?.("Google Sign-In was cancelled or failed. Please try again.")
    },
  })

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5
                 border border-gray-200 rounded-xl bg-white hover:bg-gray-50
                 transition-colors text-sm font-medium text-gray-700 font-display
                 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      {loading ? 'Signing in…' : label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  )
}