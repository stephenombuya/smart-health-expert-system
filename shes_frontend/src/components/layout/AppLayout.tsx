/**
 * SHES App Layout
 * Persistent sidebar + top header + main content area.
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { EmailVerificationBanner } from '@/components/common/EmailVerificationBanner'
import {
  LayoutDashboard, Stethoscope, Pill, Activity, Brain,
  FlaskConical, User, LogOut, Menu, X, ChevronRight,
  Heart, Sun, Moon, Users,
} from 'lucide-react'
import { cn } from '@/utils'
import { NetworkErrorBanner } from '@/components/common/NetworkErrorBanner'
import { NotificationBell } from '@/components/common/NotificationBell'

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  open,
  onClose,
  dark,
  toggleDark,
}: {
  open: boolean
  onClose: () => void
  dark: boolean
  toggleDark: () => void
}) {
  const { user, logout } = useAuth() 
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Build nav items based on user role
  const NAV_ITEMS = [
    { to: '/dashboard',   label: t('nav.dashboard'),   Icon: LayoutDashboard },
    ...(user?.role === 'doctor' 
        ? [{ to: '/doctor', label: t('nav.doctor'), Icon: Users }] 
        : []),
    { to: '/triage',      label: t('nav.triage'),      Icon: Stethoscope },
    { to: '/medications', label: t('nav.medications'), Icon: Pill },
    { to: '/chronic',     label: t('nav.chronic'),     Icon: Activity },
    { to: '/mental',      label: t('nav.mental'),      Icon: Brain },
    { to: '/lab',         label: t('nav.lab'),         Icon: FlaskConical },
    { to: '/profile',     label: t('nav.profile'),     Icon: User },
  ];


  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-full w-64 flex flex-col',
          'bg-primary-900 text-white transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-primary-800">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-display leading-tight">SHES</p>
            <p className="text-2xs text-primary-400 font-body">Smart Health Expert</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-lg text-primary-400 hover:text-white hover:bg-primary-800 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-display',
                  'transition-all duration-150 group',
                  isActive
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-300' : 'text-primary-500 group-hover:text-primary-300')} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-primary-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-primary-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user?.first_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white font-display truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-2xs text-primary-400 font-body capitalize">{user?.role}</p>
            </div>
            <NotificationBell />
          </div>

          <LanguageToggle />
          
          <button
            onClick={toggleDark}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-display text-primary-300 hover:bg-primary-800 transition-all duration-150"
          >
            {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-display text-primary-300 hover:bg-primary-800 hover:text-red-300 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── App Layout ───────────────────────────────────────────────────────────────
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleDark = () => {
    const isDark = !dark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('shes-dark', isDark ? '1' : '0')
  }

  useEffect(() => {
    if (localStorage.getItem('shes-dark') === '1') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className="flex h-screen bg-surface-100 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dark={dark}
        toggleDark={toggleDark}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary-700" />
            <span className="font-bold text-primary-900 font-display text-sm">SHES</span>
          </div>
          <NotificationBell />
        </header>

        {/* Banners */}
        <NetworkErrorBanner />
        <EmailVerificationBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
