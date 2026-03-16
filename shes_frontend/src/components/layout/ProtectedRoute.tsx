/**
 * SHES Protected Route
 * Redirects unauthenticated users to /login.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/common'

/**
 * Wraps a set of routes that require authentication.
 * Shows a full-screen loader while the auth state is being hydrated.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Redirects already-authenticated users away from login/register pages.
 */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
