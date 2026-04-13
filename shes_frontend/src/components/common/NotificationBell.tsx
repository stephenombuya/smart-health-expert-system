// src/components/common/NotificationBell.tsx

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, X, CheckCheck, BellOff, Settings, Trash2, Circle, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/services'
import { formatRelative } from '@/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: authApi.getNotifications,
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: authApi.markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Local state for optimistic updates
  const [localNotifications, setLocalNotifications] = useState<any[]>([])
  const [localUnreadCount, setLocalUnreadCount] = useState(0)

  // Sync local state with server data
  useEffect(() => {
    if (data?.results) {
      setLocalNotifications(data.results)
      setLocalUnreadCount(data.unread_count)
    }
  }, [data])

  // Handle mark single notification as read (optimistic update)
  const handleMarkSingleRead = (notificationId: string) => {
    setLocalNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setLocalUnreadCount(prev => Math.max(0, prev - 1))
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  // Handle delete notification (optimistic update)
  const handleDeleteNotification = (notificationId: string) => {
    const notification = localNotifications.find(n => n.id === notificationId)
    const wasUnread = notification && !notification.read

    setLocalNotifications(prev => prev.filter(n => n.id !== notificationId))
    if (wasUnread) {
      setLocalUnreadCount(prev => Math.max(0, prev - 1))
    }

    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const unread = localUnreadCount
  const results = localNotifications

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'all' 
    ? results 
    : results.filter((n: any) => !n.read)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  
// Simpler replacement for both the useEffect and getDropdownClasses
const [openUpward, setOpenUpward] = useState(false)

useEffect(() => {
  if (open && buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect()
    setOpenUpward(window.innerHeight - rect.bottom < 400)
  }
}, [open])

  const typeColor: Record<string, string> = {
    health_alert: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    med_reminder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    system: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    appointment: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    lab_result: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }

  const typeIcon: Record<string, React.ReactNode> = {
    health_alert: <Bell className="w-4 h-4" />,
    med_reminder: <Bell className="w-4 h-4" />,
    system: <Bell className="w-4 h-4" />,
    appointment: <Bell className="w-4 h-4" />,
    lab_result: <Bell className="w-4 h-4" />,
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          
          <div className={`absolute z-50 w-[480px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up right-0 ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-900">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">
                  {t('notifications.title')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-body mt-0.5">
                  {unread > 0 
                    ? `${unread} unread notification${unread > 1 ? 's' : ''}`
                    : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => markRead.mutate()}
                    className="px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2.5 text-sm font-semibold font-body transition-all relative ${
                  activeTab === 'all'
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                All
                {activeTab === 'all' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-4 py-2.5 text-sm font-semibold font-body transition-all relative ${
                  activeTab === 'unread'
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Unread
                {unread > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {unread}
                  </span>
                )}
                {activeTab === 'unread' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="text-xs text-gray-400 font-body mt-3">Loading notifications...</p>
                </div>
              ) : !filteredNotifications.length ? (
                <div className="py-12 text-center">
                  <BellOff className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 font-body">
                    {activeTab === 'all' 
                      ? 'No notifications yet'
                      : 'No unread notifications'}
                  </p>
                  <p className="text-xs text-gray-400 font-body mt-1">
                    {activeTab === 'all'
                      ? 'When you receive notifications, they\'ll appear here'
                      : 'Great job staying on top of things!'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n: any) => (
                  <div 
                    key={n.id} 
                    className={`px-5 py-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      !n.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        typeColor[n.type]?.split(' ')[0] || 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {typeIcon[n.type] || <Bell className="w-4 h-4" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                typeColor[n.type] || typeColor.system
                              }`}>
                                {n.type?.replace(/_/g, ' ').toUpperCase() || 'SYSTEM'}
                              </span>
                              {!n.read && (
                                <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400">
                                  <Circle className="w-1.5 h-1.5 fill-current" />
                                  New
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-1">
                              {n.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-body leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-body">
                                {formatRelative(n.created_at)}
                              </p>
                              {!n.read && (
                                <button
                                  onClick={() => handleMarkSingleRead(n.id)}
                                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {!n.read && (
                              <button
                                onClick={() => handleMarkSingleRead(n.id)}
                                className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title="Mark as read"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(n.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            {filteredNotifications.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={() => {
                    // Navigate to notifications settings page
                    navigate('/notifications/settings')
                    setOpen(false)
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1.5"
                >
                  <Settings className="w-4 h-4" />
                  Notification Settings
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}