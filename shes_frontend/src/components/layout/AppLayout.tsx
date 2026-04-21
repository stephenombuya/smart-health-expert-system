// src/components/layout/AppLayout.tsx

/**
 * SHES App Layout
 * Persistent sidebar + top header + main content area + footer.
 * Notification bell positioned in top header for maximum visibility.
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

import { LanguageToggle } from '@/components/common/LanguageToggle'
import { EmailVerificationBanner } from '@/components/common/EmailVerificationBanner'
import { Footer } from '@/components/common/Footer'
import {
  LayoutDashboard, Stethoscope, Pill, Activity, Brain,
  FlaskConical, User, LogOut, Menu, X, ChevronRight,
  Heart, Sun, Moon, Users, MessageSquare,
  Watch,
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
    { to: '/wearables',   label: t('nav.wearables'),   Icon: Watch },
    { to: '/chat',        label: t('nav.chat'),        Icon: MessageSquare },
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

        {/* User section - without notification bell now */}
        <div className="px-3 py-4 border-t border-primary-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user?.first_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white font-display truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-2xs text-primary-400 font-body capitalize">{user?.role}</p>
            </div>
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

// ─── Top Header ───────────────────────────────────────────────────────────────
function TopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleDark = () => {
    const isDark = !dark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('shes-dark', isDark ? '1' : '0')
  }

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left section - Menu button & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-primary-900 dark:text-white font-display text-lg">
              SHES
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-body ml-1">
              Smart Health Expert System
            </span>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-primary-900 dark:text-white font-display text-sm">
              SHES
            </span>
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector - Compact version for header */}
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {/* Notification Bell - Prominently placed */}
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

// ─── App Layout ───────────────────────────────────────────────────────────────
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  // Sync dark mode with sidebar
  useEffect(() => {
    const savedDark = localStorage.getItem('shes-dark') === '1'
    if (savedDark !== dark) {
      setDark(savedDark)
      if (savedDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  const toggleDark = () => {
    const isDark = !dark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('shes-dark', isDark ? '1' : '0')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dark={dark}
        toggleDark={toggleDark}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header with Notification Bell */}
        <TopHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Banners */}
        <NetworkErrorBanner />
        <EmailVerificationBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
            <Outlet />
          </div>
          {/* Footer */}
          <Footer />
        </main>
      </div>

    </div>
  )
}