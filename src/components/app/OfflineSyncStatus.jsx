import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { pendingOfflineChanges } from '../../lib/offline-store.js'

export function OfflineSyncStatus() {
  const { user } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  useEffect(() => {
    let active = true
    const refresh = async () => {
      setOnline(navigator.onLine)
      if (!user) { setPending(0); return }
      try { const entries = await pendingOfflineChanges(user.id); if (active) setPending(entries.length) } catch { /* IndexedDB may be unavailable. */ }
    }
    const syncDone = () => { void refresh() }
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh); window.addEventListener('diary:offline-queue-changed', syncDone)
    void refresh()
    return () => { active = false; window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); window.removeEventListener('diary:offline-queue-changed', syncDone) }
  }, [user])
  return <button type="button" onClick={() => window.dispatchEvent(new Event('diary:sync-offline'))} title={pending ? `${pending} perubahan menunggu sinkronisasi` : online ? 'Data tersinkron' : 'Mode offline'} aria-label={pending ? `${pending} perubahan menunggu sinkronisasi` : online ? 'Data tersinkron' : 'Mode offline'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
    {!online ? <CloudOff size={15} aria-hidden="true" /> : pending ? <RefreshCw size={15} aria-hidden="true" /> : <Cloud size={15} aria-hidden="true" />}
    <span>{!online ? 'Offline' : pending ? `${pending} menunggu` : 'Tersinkron'}</span>
  </button>
}
