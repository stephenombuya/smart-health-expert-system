/**
 * SHES Frontend – Root Router
 * Declarative route tree with lazy-loaded pages for optimal bundle splitting.
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, GuestRoute } from '@/components/layout/ProtectedRoute'
import { PageLoader } from '@/components/common'

// ── Lazy page imports ─────────────────────────────────────────────────────────
const LoginPage       = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage    = lazy(() => import('@/pages/auth/RegisterPage'))
const DashboardPage   = lazy(() => import('@/pages/dashboard/DashboardPage'))
const TriagePage      = lazy(() => import('@/pages/triage/TriagePage'))
const TriageHistoryPage = lazy(() => import('@/pages/triage/TriageHistoryPage'))
const MedicationsPage = lazy(() => import('@/pages/medications/MedicationsPage'))
const ChronicPage     = lazy(() => import('@/pages/chronic/ChronicPage'))
const MentalPage      = lazy(() => import('@/pages/mental/MentalPage'))
const LabPage         = lazy(() => import('@/pages/lab/LabPage'))
const ProfilePage     = lazy(() => import('@/pages/profile/ProfilePage'))

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Guest-only routes */}
        <Route element={<GuestRoute />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Authenticated routes – wrapped in sidebar layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"      element={<DashboardPage />} />
            <Route path="/triage"         element={<TriagePage />} />
            <Route path="/triage/history" element={<TriageHistoryPage />} />
            <Route path="/medications"    element={<MedicationsPage />} />
            <Route path="/chronic"        element={<ChronicPage />} />
            <Route path="/mental"         element={<MentalPage />} />
            <Route path="/lab"            element={<LabPage />} />
            <Route path="/profile"        element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
