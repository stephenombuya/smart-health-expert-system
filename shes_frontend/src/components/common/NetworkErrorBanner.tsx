import { useState, useEffect } from 'react'
import { WifiOff, X, RefreshCw } from 'lucide-react'

export function NetworkErrorBanner() {
  const [offline, setOffline]     = useState(!navigator.onLine)
  const [apiDown, setApiDown]     = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Browser online/offline events
  useEffect(() => {
    const goOffline = () => { setOffline(true);  setDismissed(false) }
    const goOnline  = () => { setOffline(false); setApiDown(false) }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [])

  // Listen for network errors emitted by the Axios client
  useEffect(() => {
    const handler = () => { setApiDown(true); setDismissed(false) }
    window.addEventListener('shes:network-error', handler)
    return () => window.removeEventListener('shes:network-error', handler)
  }, [])

  const show = (offline || apiDown) && !dismissed
  if (!show) return null

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 animate-fade-in">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-red-100 shrink-0">
            <WifiOff className="w-4 h-4 text-red-700" />
          </div>
          <p className="text-xs font-body text-red-800">
            {offline
              ? 'You are offline. Check your internet connection.'
              : 'Cannot reach the SHES server. Make sure the backend is running on port 8000.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 flex items-center gap-1 font-display"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-red-400 hover:bg-red-100 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}