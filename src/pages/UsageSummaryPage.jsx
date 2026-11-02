import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, Droplets, Heart, PackageOpen, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '../components/index.js'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { useProducts } from '../components/app/ProductsProvider.jsx'
import { useRoutineCalendar } from '../components/app/RoutineCalendarProvider.jsx'
import { diaryDateKey, diaryDateLabel, diaryIsoWeekday } from '../lib/diary-date.js'
import { getExpiryInfo } from '../lib/expiration.js'
import { isRoutineItemScheduledOn } from '../lib/routine-schedule.js'

function shiftDate(key, offset) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + offset, 12))
  return date.toISOString().slice(0, 10)
}

export default function UsageSummaryPage() {
  const { products, loading: productsLoading, error: productsError, reload: reloadProducts } = useProducts()
  const { routines, items, completedItemIds, loading: routineLoading, error: routineError, reload: reloadRoutines, loadActivityRange } = useRoutineCalendar()
  const today = diaryDateKey()
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekActivities, setWeekActivities] = useState([])
  const [loadingWeek, setLoadingWeek] = useState(true)
  const [selectedDate, setSelectedDate] = useState(today)

  useEffect(() => {
    let current = true
    setHistoryError('')
    loadActivityRange(shiftDate(today, -29), today).then((rows) => { if (current) setHistory(rows) })
      .catch((error) => { if (current) setHistoryError(error.message || 'Riwayat pemakaian gagal dimuat.') })
    return () => { current = false }
  }, [loadActivityRange, today, retryKey])

  const weekStart = shiftDate(today, -(diaryIsoWeekday(today) - 1) + weekOffset * 7)
  const weekEnd = shiftDate(weekStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index))
  useEffect(() => {
    let current = true
    setLoadingWeek(true)
    setHistoryError('')
    setSelectedDate(weekOffset === 0 ? today : weekStart)
    loadActivityRange(weekStart, weekEnd).then((rows) => { if (current) setWeekActivities(rows) })
      .catch((error) => { if (current) setHistoryError(error.message || 'Riwayat mingguan gagal dimuat.') })
      .finally(() => { if (current) setLoadingWeek(false) })
    return () => { current = false }
  }, [loadActivityRange, today, weekStart, weekEnd, retryKey, weekOffset])

  const skincare = products.filter((product) => product.categoryGroup !== 'makeup')
  const makeup = products.filter((product) => product.categoryGroup === 'makeup')
  const inUse = products.filter((product) => product.productStatus === 'in_use')
  const finished = products.filter((product) => product.productStatus === 'finished')
  const expiring = products.filter((product) => ['expired', 'expiring_soon'].includes(getExpiryInfo(product, today).status))
  const activeRoutines = routines.filter((routine) => routine.is_active !== false)
  const activeItems = items.filter((item) => activeRoutines.some((routine) => routine.id === item.routine_id))
  const doneToday = activeItems.filter((item) => completedItemIds.includes(item.id)).length
  const completion = activeItems.length ? Math.round(doneToday / activeItems.length * 100) : 0
  const recentProductLogs = history.filter((activity) => activity.product_id && ['product_used', 'routine_note'].includes(activity.activity_type))
  const usageCounts = useMemo(() => recentProductLogs.reduce((counts, activity) => { counts[activity.product_id] = (counts[activity.product_id] ?? 0) + 1; return counts }, {}), [recentProductLogs])
  const mostUsedId = Object.keys(usageCounts).sort((a, b) => usageCounts[b] - usageCounts[a])[0]
  const mostUsed = products.find((product) => product.id === mostUsedId)
  const lastUsedActivity = [...recentProductLogs].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0]
  const lastUsed = products.find((product) => product.id === lastUsedActivity?.product_id)
  const logsPerDay = weekDays.map((date) => ({ date, count: weekActivities.filter((row) => row.activity_date === date && row.activity_type === 'product_used').length }))
  const usageDaysThisWeek = logsPerDay.filter((day) => day.count > 0).length
  const completionFor = (date, kind) => {
    if (date > today) return { scheduled: 0, done: 0, complete: false, future: true }
    const routine = routines.find((entry) => entry.kind === kind && entry.is_active !== false)
    const scheduledItems = items.filter((item) => item.routine_id === routine?.id && isRoutineItemScheduledOn(item, routine, diaryIsoWeekday(date)))
    const completedIds = new Set(weekActivities.filter((row) => row.activity_date === date && row.routine_item_id).map((row) => row.routine_item_id))
    const done = scheduledItems.filter((item) => completedIds.has(item.id)).length
    return { scheduled: scheduledItems.length, done, complete: scheduledItems.length > 0 && done === scheduledItems.length }
  }
  const selectedDayProgress = ['morning', 'evening'].map((kind) => ({ kind, ...completionFor(selectedDate, kind) }))
  const rangeLabel = `${diaryDateLabel(weekStart, { day: 'numeric', month: 'short' })} – ${diaryDateLabel(weekEnd, { day: 'numeric', month: 'short', year: 'numeric' })}`

  const stats = [
    { label: 'Semua produk', value: products.length, icon: PackageOpen, to: '/collection', tone: 'rose' },
    { label: 'Skincare', value: skincare.length, icon: Droplets, to: '/collection?category=Skincare', tone: 'cream' },
    { label: 'Make Up', value: makeup.length, icon: Sparkles, to: '/collection?category=Make%20Up', tone: 'muted' },
    { label: 'Sedang digunakan', value: inUse.length, icon: Heart, to: '/collection?productStatus=in_use', tone: 'rose' },
    { label: 'Sudah habis', value: finished.length, icon: Check, to: '/collection?productStatus=finished', tone: 'cream' },
    { label: 'Perlu diperiksa', value: expiring.length, icon: Clock3, to: '/calendar', tone: 'muted' },
  ]

  return <main className="page-content usage-summary-page">
    <PageHeading eyebrow="Catatan kecil yang berarti" title="Ringkasan Pemakaian" description="Lihat koleksi dan kebiasaanmu tumbuh, satu hari pada satu waktu." action={<Badge tone="cream" dot>{diaryDateLabel(today, { day: 'numeric', month: 'long' })}</Badge>} />
    {(productsError || historyError || routineError) && <Card className="summary-error" role="alert"><p>{productsError || historyError || routineError}</p><Button variant="outline" onClick={() => { void reloadProducts(); void reloadRoutines(); setRetryKey((value) => value + 1) }}>Coba lagi</Button></Card>}
    <section className="usage-summary-stats" aria-label="Ringkasan koleksi produk">
      {stats.map(({ label, value, icon: Icon, to, tone }, index) => <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}><Link to={to} className={`usage-stat usage-stat--${tone}`}><span className="usage-stat__icon"><Icon size={19} /></span><strong>{productsLoading || productsError ? '—' : value}</strong><span>{label}</span><ArrowRight className="usage-stat__arrow" size={15} /></Link></motion.div>)}
    </section>
    <section className="usage-summary-columns">
      <Card className="usage-progress-card"><div className="usage-card-heading"><div><p className="page-eyebrow">RUTINITAS HARI INI</p><h2>{routineLoading || routineError ? '—' : `${completion}% selesai`}</h2></div><span className="usage-progress-card__ring">{routineLoading || routineError ? '…' : `${completion}%`}</span></div><div className="progress-track" role="progressbar" aria-label="Penyelesaian rutinitas hari ini" aria-valuenow={routineLoading || routineError ? 0 : doneToday} aria-valuemin={0} aria-valuemax={activeItems.length || 1}><span style={{ width: `${routineLoading || routineError ? 0 : completion}%` }} /></div><p>{routineLoading || routineError ? 'Memuat data rutinitas…' : `${activeRoutines.length} rutinitas aktif · ${doneToday} dari ${activeItems.length} langkah hari ini.`}</p><p className="summary-positive">{completion === 100 && activeItems.length ? 'Kamu sudah menyelesaikan semua langkah hari ini. Senang melihat ritual kecilmu tercatat.' : completion > 0 ? 'Konsistensimu mulai terlihat, lanjutkan dengan ritmemu sendiri.' : 'Setiap langkah yang kamu catat adalah awal yang baik.'}</p><Link className="text-link" to="/routine">Buka Daily Routine <ArrowRight size={14} /></Link></Card>
      <Card className="usage-history-card"><div className="usage-card-heading"><div><p className="page-eyebrow">AKTIVITAS MINGGUAN</p><h2>Aktivitas produk</h2></div><span className="usage-history-card__sparkle">✿</span></div><div className="usage-week-navigation"><button type="button" aria-label="Lihat minggu sebelumnya" onClick={() => setWeekOffset((offset) => offset - 1)}><ChevronLeft size={16} /></button><strong>{rangeLabel}</strong><button type="button" aria-label="Lihat minggu berikutnya" disabled={weekOffset === 0} onClick={() => setWeekOffset((offset) => Math.min(0, offset + 1))}><ChevronRight size={16} /></button></div>{loadingWeek ? <p role="status">Memuat aktivitas mingguan…</p> : <div className="usage-week-chart">{logsPerDay.map(({ date, count }) => { const morning = completionFor(date, 'morning'); const evening = completionFor(date, 'evening'); const status = (value) => value.future ? 'belum tiba' : value.scheduled ? `${value.done}/${value.scheduled} ${value.complete ? 'selesai' : 'belum selesai'}` : 'tidak dijadwalkan'; return <button type="button" key={date} className={`usage-week-day ${selectedDate === date ? 'usage-week-day--selected' : ''}`} aria-pressed={selectedDate === date} title={`${diaryDateLabel(date, { day: 'numeric', month: 'short' })} · Pagi: ${status(morning)} · Malam: ${status(evening)} · ${count} pemakaian produk`} onClick={() => setSelectedDate(date)}><span style={{ height: `${Math.max(count ? 18 : 5, Math.min(100, count * 20))}%` }} /><small>{diaryDateLabel(date, { weekday: 'short' }).slice(0, 2)}</small><small>{diaryDateLabel(date, { day: 'numeric' })}</small></button> })}</div>}<div className="usage-week-routines"><h3>Rutinitas {diaryDateLabel(selectedDate, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>{selectedDayProgress.map(({ kind, scheduled, done, complete, future }) => <div className="usage-week-routine" key={kind}><strong>{kind === 'morning' ? 'Pagi' : 'Malam'}</strong><span>{future ? 'belum tiba' : scheduled ? `${done}/${scheduled} langkah · ${complete ? 'selesai semua' : 'belum selesai'}` : 'tidak dijadwalkan'}</span><i className={complete ? 'usage-week-routine__complete' : ''}>{complete ? '✓' : scheduled ? '×' : '·'}</i></div>)}</div><p>{history.length ? `${history.length} aktivitas tercatat dalam 30 hari terakhir. Produk dipakai pada ${usageDaysThisWeek} hari pada minggu ini.` : 'Belum ada pemakaian tercatat untuk periode ini.'}</p><Link className="text-link" to="/calendar">Lihat kalender aktivitas <ArrowRight size={14} /></Link></Card>
    </section>
    <section className="usage-summary-columns usage-summary-columns--recent">
      <Card className="usage-feature-card"><p className="page-eyebrow">PALING SERING TERCATAT</p>{mostUsed ? <><h2>{mostUsed.name}</h2><p>{usageCounts[mostUsed.id]} kali dalam 30 hari terakhir</p><Link className="text-link" to={`/collection/${mostUsed.id}`}>Lihat produk <ArrowRight size={14} /></Link></> : <><h2>Belum ada data cukup</h2><p>Checklist rutinitas yang tersimpan akan membantu menampilkan pola pemakaian.</p><Link className="text-link" to="/routine">Catat rutinitas <ArrowRight size={14} /></Link></>}</Card>
      <Card className="usage-feature-card"><p className="page-eyebrow">TERAKHIR DIGUNAKAN</p>{lastUsed ? <><h2>{lastUsed.name}</h2><p>{diaryDateLabel(lastUsedActivity.activity_date, { day: 'numeric', month: 'long' })}</p><Link className="text-link" to={`/collection/${lastUsed.id}`}>Lihat produk <ArrowRight size={14} /></Link></> : <><h2>Belum ada pemakaian tercatat</h2><p>Checklist produk yang selesai akan muncul di sini.</p><Link className="text-link" to="/routine">Buka rutinitas <ArrowRight size={14} /></Link></>}</Card>
    </section>
  </main>
}
