import { Bell, CalendarDays, Droplets, Home, LogOut, PackageOpen, Settings2 } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appNavigation } from '../../data/navigation.js'
import { RouteErrorBoundary } from './RouteErrorBoundary.jsx'
import { mockProfile } from '../../data/profile.js'
import { BottomNavigation, Sidebar, useToast } from '../index.js'
import { useAuth } from '../auth/AuthProvider.jsx'

const icons = { Home, CalendarDays, PackageOpen, Droplets, Settings2 }

export function AppShell() {
  const location = useLocation()
  const { showToast } = useToast()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const activeKey = location.pathname.startsWith('/collection') ? 'collection'
    : location.pathname === '/calendar' ? 'calendar'
      : location.pathname === '/routine' ? 'routine'
        : location.pathname === '/usage-summary' ? 'settings'
        : location.pathname === '/settings' ? 'settings' : 'dashboard'
  const navItems = appNavigation.map((item) => ({ ...item, href: item.path, icon: icons[item.icon] }))

  async function handleLogout() {
    try { await signOut(); navigate('/login', { replace: true }) }
    catch (error) { showToast(error.message || 'Gagal keluar dari akun.', { tone: 'error' }) }
  }

  return (
    <div className="app-shell">
      <Sidebar items={navItems} activeKey={activeKey} profile={{ name: user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email || mockProfile.name, subtitle: 'Akun pribadi' }} onLogout={handleLogout} brandName="my skin diary" />
      <div className="main-panel">
        <header className="topbar">
          <div className="topbar__crumb"><span>My Skin Diary</span><span className="topbar__crumb-divider">/</span><strong>{location.pathname === '/usage-summary' ? 'Ringkasan Pemakaian' : appNavigation.find((item) => item.key === activeKey)?.label ?? 'Dashboard'}</strong></div>
          <div className="topbar__actions">
            <span className="topbar__date"><CalendarDays size={15} aria-hidden="true" /> Hari ini, catat dengan lembut</span>
            <button className="icon-button topbar__notification" type="button" aria-label="Notifikasi" onClick={() => showToast('Kamu sudah melihat semua notifikasi.', { tone: 'info' })}>
              <Bell size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" aria-label="Keluar dari akun" onClick={handleLogout}><LogOut size={17} aria-hidden="true" /></button>
          </div>
        </header>
        <div key={location.pathname} className="route-content">
          <RouteErrorBoundary><Outlet /></RouteErrorBoundary>
        </div>
      </div>
      <BottomNavigation items={navItems} activeKey={activeKey} label="Navigasi utama" />
    </div>
  )
}
