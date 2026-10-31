import { ArrowRight, Bell, Check, ChartNoAxesCombined, Download, Heart, KeyRound, Moon, ShieldCheck, Smartphone, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Input, useToast } from '../components/index.js'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { useAppData } from '../components/app/AppDataProvider.jsx'
import { weeklySummary } from '../data/routines.js'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRoutineCalendar } from '../components/app/RoutineCalendarProvider.jsx'
import { getPushSubscription, pushSupport, subscribeToPush, unsubscribeFromPush } from '../lib/push-api.js'
import { supabase } from '../lib/supabaseClient.js'

export default function SettingsPage() {
  const { products, favorites, completedSteps } = useAppData()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const [profileName, setProfileName] = useState(displayName)
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '')
  const [pendingEmail, setPendingEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const { preferences, savePreferences } = useRoutineCalendar()
  const { showToast } = useToast()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(() => window.deferredPwaInstallPrompt ?? null)
  const [installed, setInstalled] = useState(false)
  const pushAvailability = pushSupport()
  const vapidKeyConfigured = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim())
  const completedCount = Object.values(completedSteps).filter(Boolean).length

  useEffect(() => {
    if (!user) return
    setProfileName(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '')
    setProfileEmail(user.email ?? '')
    if (pendingEmail && user.email?.toLowerCase() === pendingEmail.toLowerCase()) setPendingEmail('')
  }, [user?.id, user?.email, user?.user_metadata?.display_name, user?.user_metadata?.full_name])

  useEffect(() => {
    let alive = true
    getPushSubscription().then((subscription) => { if (alive) setPushEnabled(Boolean(subscription)) }).catch(() => {})
    const onInstall = () => setInstallPrompt(window.deferredPwaInstallPrompt ?? null)
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('pwa-install-available', onInstall)
    window.addEventListener('pwa-installed', onInstalled)
    return () => { alive = false; window.removeEventListener('pwa-install-available', onInstall); window.removeEventListener('pwa-installed', onInstalled) }
  }, [])

  async function togglePush() {
    if (!user) return
    setPushBusy(true)
    try {
      if (pushEnabled) await unsubscribeFromPush(user.id)
      else await subscribeToPush(user.id)
      setPushEnabled(!pushEnabled)
      showToast(pushEnabled ? 'Notifikasi push dinonaktifkan.' : 'Notifikasi push diaktifkan.')
    } catch (error) { showToast(error.message || 'Pengaturan push belum dapat diperbarui.', { tone: 'error' }) }
    finally { setPushBusy(false) }
  }

  async function updateNotificationPreference(patch) {
    try { await savePreferences(patch) }
    catch (error) { showToast(error.message || 'Pengaturan notifikasi belum dapat disimpan.', { tone: 'error' }) }
  }

  async function installApp() {
    const prompt = window.deferredPwaInstallPrompt
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    window.deferredPwaInstallPrompt = null
    setInstallPrompt(null)
  }

  async function saveProfile(event) {
    event.preventDefault()
    const nextName = profileName.trim()
    const nextEmail = profileEmail.trim()
    if (!user || !supabase) { showToast('Sesi atau koneksi akun belum tersedia.', { tone: 'error' }); return }
    if (!nextName || !nextEmail) { showToast('Nama dan email wajib diisi.', { tone: 'error' }); return }

    const nameChanged = nextName !== displayName
    const emailChanged = nextEmail.toLowerCase() !== user.email?.toLowerCase()
    if (!nameChanged && !emailChanged) { showToast('Tidak ada perubahan untuk disimpan.', { tone: 'info' }); return }

    setProfileBusy(true)
    try {
      if (nameChanged) {
        const { error } = await supabase.auth.updateUser({ data: { display_name: nextName } })
        if (error) throw error
      }
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser(
          { email: nextEmail },
          { emailRedirectTo: window.location.origin },
        )
        if (error) throw error
        setPendingEmail(nextEmail)
        showToast('Permintaan perubahan email dikirim. Buka email konfirmasi untuk menyelesaikan perubahan.', { tone: 'info' })
      } else {
        showToast('Nama profil berhasil diperbarui.')
      }
    } catch (error) { showToast(error.message || 'Profil belum dapat diperbarui.', { tone: 'error' }) }
    finally { setProfileBusy(false) }
  }

  async function changePassword(event) {
    event.preventDefault()
    if (!user || !supabase) { showToast('Sesi atau koneksi akun belum tersedia.', { tone: 'error' }); return }
    if (!currentPassword) { showToast('Masukkan password lama terlebih dahulu.', { tone: 'error' }); return }
    setPasswordBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword })
      if (error) throw error
      setCurrentPassword('')
      setNewPassword('')
      showToast('Password berhasil diubah.')
    } catch (error) { showToast(error.message || 'Password belum dapat diubah.', { tone: 'error' }) }
    finally { setPasswordBusy(false) }
  }

  function exportData() {
    const file = new Blob([JSON.stringify({ profile: { name: profileName, email: profileEmail }, collection: products, favorites, routineProgress: completedSteps }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'my-skin-diary-data.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast('Salinan data jurnalmu sudah diunduh.')
  }

  return (
    <main className="page-content">
      <PageHeading eyebrow="Ruang personalmu" title="Settings" description="Atur akun dan pengalaman jurnal kulitmu." action={<Badge tone="cream" dot>Akun personal</Badge>} />

      <div className="settings-layout">
        <div className="settings-main">
          <Card className="settings-card">
            <div className="settings-card__heading"><span className="settings-card__icon"><Heart size={17} aria-hidden="true" /></span><div><h2>Profil kamu</h2><p>Informasi dasar untuk jurnal personalmu.</p></div></div>
            <div className="settings-profile">
              <span className="avatar avatar--large" aria-hidden="true">{profileName.trim().charAt(0).toUpperCase() || 'A'}</span>
              <div><strong>{profileName || 'Nama kamu'}</strong><span>{user?.email || 'Email akun'}</span></div>
            </div>
            <form className="account-profile-form" onSubmit={saveProfile}>
              <div className="settings-fields"><Input label="Nama" autoComplete="name" value={profileName} onChange={(event) => setProfileName(event.target.value)} disabled={profileBusy} required /><Input label="Email" type="email" autoComplete="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} disabled={profileBusy} required /></div>
              <Button type="submit" leadingIcon={<Check size={15} />} loading={profileBusy}>Simpan profil</Button>
            </form>
            {pendingEmail && <p className="account-email-pending" role="status">Perubahan email ke <strong>{pendingEmail}</strong> menunggu konfirmasi. Email akun tetap {user?.email} sampai tautan konfirmasi dibuka.</p>}
            <div className="account-password-divider" />
            <form className="account-password-form" onSubmit={changePassword}>
              <div className="account-password-form__heading"><KeyRound size={16} aria-hidden="true" /><div><h3>Ubah password</h3><p>Masukkan password lama dan password baru.</p></div></div>
              <div className="settings-fields"><Input label="Password lama" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={passwordBusy} required /><Input label="Password baru" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={passwordBusy} required /></div>
              <Button type="submit" variant="outline" leadingIcon={<KeyRound size={15} />} loading={passwordBusy}>Ubah password</Button>
            </form>
          </Card>

          <Card className="settings-card settings-summary-link-card">
            <Link className="settings-summary-link" to="/usage-summary">
              <span className="settings-summary-link__icon"><ChartNoAxesCombined size={20} aria-hidden="true" /></span>
              <span className="settings-summary-link__copy"><strong>Ringkasan Pemakaian</strong><small>Lihat koleksi, rutinitas, dan aktivitas pemakaianmu.</small></span>
              <ArrowRight className="settings-summary-link__arrow" size={18} aria-hidden="true" />
            </Link>
          </Card>

          <Card className="settings-card">
            <div className="settings-card__heading"><span className="settings-card__icon"><Bell size={17} aria-hidden="true" /></span><div><h2>Notifikasi push</h2><p>Pengingat dapat diterima saat My Skin Diary tidak terbuka, jika browser dan perangkat mendukung push.</p></div></div>
            <div className="push-reminder-grid">
              <section className="push-reminder-card" aria-labelledby="push-morning-heading">
                <div className="push-reminder-card__heading"><span className="setting-row__icon"><Sun size={16} /></span><div><h3 id="push-morning-heading">Rutinitas pagi</h3><p>Pengingat rutinitas pagi</p></div></div>
                <label className="push-reminder-toggle"><span>{preferences.daily_routine_enabled ? 'Aktif' : 'Nonaktif'}</span><input className="toggle-input" type="checkbox" checked={preferences.daily_routine_enabled} onChange={(event) => void updateNotificationPreference({ daily_routine_enabled: event.target.checked })} aria-label="Aktifkan pengingat rutinitas pagi" /><span className="toggle-switch" aria-hidden="true" /></label>
                <div className="push-reminder-card__field"><label htmlFor="push-morning-time">Jam pengingat</label><input id="push-morning-time" type="time" value={String(preferences.morning_reminder_time).slice(0, 5)} onChange={(event) => void updateNotificationPreference({ morning_reminder_time: `${event.target.value}:00` })} disabled={!preferences.daily_routine_enabled} /></div>
                <small className="push-reminder-card__timezone">Waktu Asia/Jakarta</small>
              </section>

              <section className="push-reminder-card" aria-labelledby="push-evening-heading">
                <div className="push-reminder-card__heading"><span className="setting-row__icon"><Moon size={16} /></span><div><h3 id="push-evening-heading">Rutinitas malam</h3><p>Pengingat rutinitas malam</p></div></div>
                <label className="push-reminder-toggle"><span>{preferences.evening_reminder_enabled ? 'Aktif' : 'Nonaktif'}</span><input className="toggle-input" type="checkbox" checked={preferences.evening_reminder_enabled} onChange={(event) => void updateNotificationPreference({ evening_reminder_enabled: event.target.checked })} aria-label="Aktifkan pengingat rutinitas malam" /><span className="toggle-switch" aria-hidden="true" /></label>
                <div className="push-reminder-card__field"><label htmlFor="push-evening-time">Jam pengingat</label><input id="push-evening-time" type="time" value={String(preferences.evening_reminder_time).slice(0, 5)} onChange={(event) => void updateNotificationPreference({ evening_reminder_time: `${event.target.value}:00` })} disabled={!preferences.evening_reminder_enabled} /></div>
                <small className="push-reminder-card__timezone">Waktu Asia/Jakarta</small>
              </section>

              <section className="push-reminder-card" aria-labelledby="push-expiry-heading">
                <div className="push-reminder-card__heading"><span className="setting-row__icon"><Bell size={16} /></span><div><h3 id="push-expiry-heading">Masa berlaku produk</h3><p>Pengingat sebelum produk kedaluwarsa</p></div></div>
                <label className="push-reminder-toggle"><span>{preferences.product_expiry_enabled ? 'Aktif' : 'Nonaktif'}</span><input className="toggle-input" type="checkbox" checked={preferences.product_expiry_enabled} onChange={(event) => void updateNotificationPreference({ product_expiry_enabled: event.target.checked })} aria-label="Aktifkan pengingat masa berlaku produk" /><span className="toggle-switch" aria-hidden="true" /></label>
                <div className="push-reminder-card__fields">
                  <div className="push-reminder-card__field"><label htmlFor="push-expiry-days">Ingatkan sebelum</label><div className="push-reminder-card__input-unit"><input id="push-expiry-days" type="number" min="0" max="90" value={preferences.product_expiry_days_before} onChange={(event) => void updateNotificationPreference({ product_expiry_days_before: Number(event.target.value) })} disabled={!preferences.product_expiry_enabled} /><span>hari</span></div></div>
                  <div className="push-reminder-card__field"><label htmlFor="push-expiry-time">Jam pengingat</label><input id="push-expiry-time" type="time" value={String(preferences.product_expiry_reminder_time).slice(0, 5)} onChange={(event) => void updateNotificationPreference({ product_expiry_reminder_time: `${event.target.value}:00` })} disabled={!preferences.product_expiry_enabled} /></div>
                </div>
                <small className="push-reminder-card__timezone">Waktu Asia/Jakarta</small>
              </section>
            </div>
            <div className="settings-actions push-notification-actions"><Button type="button" variant={pushEnabled ? 'outline' : 'primary'} loading={pushBusy} disabled={!pushAvailability.supported || (!pushEnabled && !vapidKeyConfigured)} onClick={togglePush}>{pushEnabled ? 'Matikan notifikasi di perangkat ini' : vapidKeyConfigured ? 'Aktifkan notifikasi di perangkat ini' : 'Notifikasi belum dikonfigurasi'}</Button></div>
            {!pushAvailability.secure && <p className="dashboard-message">Push memerlukan HTTPS. localhost dapat digunakan saat pengembangan.</p>}
            {pushAvailability.secure && !pushAvailability.supported && <p className="dashboard-message">Browser ini belum mendukung Web Push.</p>}
            {pushAvailability.supported && !vapidKeyConfigured && <p className="push-config-message">Push belum siap: kunci publik VAPID belum ada di <code>.env.local</code>. Pengiriman juga memerlukan pasangan kunci privat di Supabase Edge Function secrets.</p>}
          </Card>

          <Card className="settings-card">
            <div className="settings-card__heading"><span className="settings-card__icon"><Smartphone size={17} aria-hidden="true" /></span><div><h2>Pasang aplikasi</h2><p>Gunakan My Skin Diary dari layar utama perangkat.</p></div></div>
            {installPrompt ? <Button type="button" leadingIcon={<Download size={16} />} onClick={() => void installApp()}>Pasang My Skin Diary</Button> : <p className="dashboard-message">{installed ? 'Aplikasi sudah terpasang.' : 'Di iPhone/iPad, buka menu Bagikan di Safari lalu pilih “Tambahkan ke Layar Utama”. Di browser lain, gunakan menu browser “Install” atau “Tambahkan ke layar utama”.'}</p>}
            <p className="dashboard-message">Push di web memerlukan HTTPS. Untuk menerima notifikasi saat aplikasi tertutup, izinkan notifikasi pada perangkat dan jangan membatasi aktivitas background browser.</p>
          </Card>

        </div>

        <aside className="settings-aside">
          <Card className="settings-summary-card"><span className="settings-summary-card__icon"><ShieldCheck size={19} /></span><p className="page-eyebrow">RUANG AMAN</p><h2>Jurnalmu milikmu.</h2><p>Data contoh ini tersimpan sementara di sesi aplikasi. Belum terhubung ke layanan eksternal.</p><div className="settings-summary-card__rule" /><span className="settings-summary-card__detail"><Check size={14} /> Tidak ada backend terhubung</span></Card>
          <Card className="settings-data-card"><div className="settings-card__heading"><span className="settings-card__icon"><Download size={17} /></span><div><h2>Data jurnal</h2><p>Ringkasan catatan lokal.</p></div></div><div className="settings-data-stats"><span><strong>{products.length}</strong><small>Produk</small></span><span><strong>{favorites.length}</strong><small>Favorit</small></span><span><strong>{completedCount}</strong><small>Langkah</small></span></div><Button variant="outline" className="settings-export" leadingIcon={<Download size={15} />} onClick={exportData}>Unduh salinan data</Button></Card>
          <Card className="settings-gentle-note"><span><Moon size={17} /></span><p>Ritual kecil tetap berarti, bahkan di hari yang sibuk.</p></Card>
        </aside>
      </div>
      <footer className="page-footer"><span><Heart size={13} aria-hidden="true" /> Dibuat dengan lembut, untuk perjalananmu</span><span>My Skin Diary · {weeklySummary.completed} langkah minggu ini</span></footer>
    </main>
  )
}
