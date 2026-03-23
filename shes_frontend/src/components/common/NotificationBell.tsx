import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/services'
import { formatRelative } from '@/utils'

export function NotificationBell() {
  const [open, setOpen]   = useState(false)
  const qc                = useQueryClient()
  const { t } = useTranslation()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn:  authApi.getNotifications,
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: authApi.markNotificationsRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread   = data?.unread_count ?? 0
  const results  = data?.results ?? []

  const typeColor: Record<string, string> = {
    health_alert: 'bg-red-100 text-red-700',
    med_reminder: 'bg-blue-100 text-blue-700',
    system:       'bg-gray-100 text-gray-600',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-2xs font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 font-display">{t('notifications.title')}</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => markRead.mutate()}
                    className="text-xs text-primary-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> {t('notifications.markAllRead')}
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {!results.length ? (
                <div className="py-8 text-center">
                  <Bell className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-body">{t('notifications.noNotifications')}</p>
                </div>
              ) : results.map((n: any) => (
                <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-primary-50/40' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-2xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${typeColor[n.type] ?? typeColor.system}`}>
                      {n.type.replace('_', ' ')}
                    </span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 font-display mt-1">{n.title}</p>
                  <p className="text-xs text-gray-500 font-body mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-2xs text-gray-400 font-body mt-1">{formatRelative(n.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}