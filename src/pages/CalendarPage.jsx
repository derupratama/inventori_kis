import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Heart, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Modal, useToast } from '../components/index.js'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { ConfirmationDialog } from '../components/app/ConfirmationDialog.jsx'
import { useProducts } from '../components/app/ProductsProvider.jsx'
import { useRoutineCalendar } from '../components/app/RoutineCalendarProvider.jsx'
import { diaryCalendarDays, diaryDateKey, diaryDateLabel, diaryMonthKey, diaryMonthLabel, diaryTimeLabel, monthDateRange, shiftDiaryMonth } from '../lib/diary-date.js'
import { getExpiryInfo } from '../lib/expiration.js'

const weekdayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const activityLabels = { skin_note: 'Catatan kulit', product_used: 'Langkah skincare selesai', routine_note: 'Catatan rutinitas', reaction: 'Reaksi kulit' }

function isValidDiaryDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

function eventText(activity, items, products) {
  const item = items.find(({ id }) => id === activity.routine_item_id)
  const product = products.find(({ id }) => id === activity.product_id)
  if (activity.activity_type === 'product_used' || activity.activity_type === 'routine_note') return item?.label ?? product?.name ?? activityLabels[activity.activity_type]
  return activity.mood ?? activityLabels[activity.activity_type] ?? 'Aktivitas kulit'
}

export default function CalendarPage() {
  const [searchParams] = useSearchParams()
  const requestedDate = searchParams.get('date')
  const validRequestedDate = isValidDiaryDate(requestedDate) ? requestedDate : null
  const initialDate = validRequestedDate ?? diaryDateKey()
  const [visibleMonth, setVisibleMonth] = useState(initialDate.slice(0, 7) || diaryMonthKey())
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [view, setView] = useState('month')
  const [modalOpen, setModalOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState(null)
  const [deletingNoteId, setDeletingNoteId] = useState('')
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const { items, activities, activityMonth, calendarLoading, error, loadActivities, addSkinNote, deleteSkinNote } = useRoutineCalendar()
  const { showToast } = useToast()
  const days = useMemo(() => diaryCalendarDays(visibleMonth), [visibleMonth])
  const range = useMemo(() => monthDateRange(visibleMonth), [visibleMonth])
  const visibleActivities = useMemo(() => activities.filter((activity) => activity.activity_date >= range.from && activity.activity_date <= range.to), [activities, range])
  const expiries = useMemo(() => products.map((product) => ({ ...product, expiryInfo: getExpiryInfo(product) }))
    .filter((product) => product.expiryInfo.effectiveExpiryDate && product.expiryInfo.effectiveExpiryDate >= range.from && product.expiryInfo.effectiveExpiryDate <= range.to), [products, range])
  const activitiesByDate = useMemo(() => visibleActivities.reduce((map, activity) => {
    map[activity.activity_date] = [...(map[activity.activity_date] ?? []), activity]
    return map
  }, {}), [visibleActivities])
  const expiriesByDate = useMemo(() => expiries.reduce((map, product) => {
    const date = product.expiryInfo.effectiveExpiryDate
    map[date] = [...(map[date] ?? []), product]
    return map
  }, {}), [expiries])
  const selectedActivities = activitiesByDate[selectedDate] ?? []
  const selectedExpiries = expiriesByDate[selectedDate] ?? []
  const activeDays = new Set([...Object.keys(activitiesByDate), ...Object.keys(expiriesByDate)])

  useEffect(() => {
    if (activityMonth === visibleMonth) return
    void loadActivities(visibleMonth).catch((loadError) => showToast(loadError.message || 'Aktivitas kalender gagal dimuat.', { tone: 'error' }))
  }, [activityMonth, visibleMonth, loadActivities, showToast])

  useEffect(() => {
    if (!validRequestedDate) return
    setSelectedDate(validRequestedDate)
    setVisibleMonth(validRequestedDate.slice(0, 7))
  }, [validRequestedDate])

  function changeMonth(nextMonth) {
    setVisibleMonth(nextMonth)
    setSelectedDate(`${nextMonth}-01`)
  }

  function selectDate(key) {
    setSelectedDate(key)
    if (key.slice(0, 7) !== visibleMonth) setVisibleMonth(key.slice(0, 7))
  }

  async function saveEntry(event) {
    event.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    try {
      await addSkinNote(selectedDate, note.trim())
      setModalOpen(false)
      setNote('')
      showToast('Catatan kulit tersimpan ke kalender.')
    } catch (saveError) { showToast(saveError.message || 'Catatan gagal disimpan.', { tone: 'error' }) }
    finally { setSaving(false) }
  }

  async function confirmDeleteNote() {
    if (!noteToDelete) return
    const activityId = noteToDelete.id
    setNoteToDelete(null)
    setDeletingNoteId(activityId)
    try {
      await deleteSkinNote(activityId)
      showToast('Catatan manual dihapus dari kalender.')
    } catch (deleteError) { showToast(deleteError.message || 'Catatan belum dapat dihapus.', { tone: 'error' }) }
    finally { setDeletingNoteId('') }
  }

  const agendaRows = useMemo(() => {
    const grouped = new Map()
    for (const activity of visibleActivities) grouped.set(activity.activity_date, [...(grouped.get(activity.activity_date) ?? []), { type: 'activity', value: activity }])
    for (const product of expiries) {
      const date = product.expiryInfo.effectiveExpiryDate
      grouped.set(date, [...(grouped.get(date) ?? []), { type: 'expiry', value: product }])
    }
    return [...grouped.entries()].sort(([left], [right]) => right.localeCompare(left))
  }, [visibleActivities, expiries])

  return (
    <main className="page-content">
      <PageHeading eyebrow="Perjalanan kulitmu" title="Kalender kulit" description="Aktivitas rutinitas dan catatan kulit dalam kalender Asia/Jakarta." action={<Button leadingIcon={<Plus size={16} />} onClick={() => { setNote(''); setModalOpen(true) }}>Catat hari ini</Button>} />

      <div className="calendar-layout">
        <Card className="calendar-card">
          <div className="calendar-card__header">
            <div><p className="page-eyebrow">KALENDER AKTIVITAS</p><h2>{diaryMonthLabel(visibleMonth)}</h2></div>
            <div className="calendar-card__controls">
              <div className="calendar-view-toggle" role="group" aria-label="Tampilan kalender"><Button size="sm" variant={view === 'month' ? 'secondary' : 'ghost'} aria-pressed={view === 'month'} onClick={() => setView('month')}>Bulan</Button><Button size="sm" variant={view === 'agenda' ? 'secondary' : 'ghost'} aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Agenda</Button></div>
              <Button variant="outline" size="sm" onClick={() => { const month = diaryMonthKey(); setVisibleMonth(month); setSelectedDate(diaryDateKey()) }}>Hari ini</Button>
              <Button variant="outline" size="icon" aria-label="Bulan sebelumnya" onClick={() => changeMonth(shiftDiaryMonth(visibleMonth, -1))}><ChevronLeft size={17} /></Button>
              <Button variant="outline" size="icon" aria-label="Bulan berikutnya" onClick={() => changeMonth(shiftDiaryMonth(visibleMonth, 1))}><ChevronRight size={17} /></Button>
            </div>
          </div>

          {view === 'month' ? <div className="calendar-grid" role="group" aria-label={`Kalender ${diaryMonthLabel(visibleMonth)}`}>
            {weekdayLabels.map((label) => <span className="calendar-weekday" key={label}>{label}</span>)}
            {days.map((key) => {
              const inMonth = key.slice(0, 7) === visibleMonth
              const hasActivity = Boolean(activitiesByDate[key]?.length)
              const hasExpiry = Boolean(expiriesByDate[key]?.length)
              const activityCount = activitiesByDate[key]?.length ?? 0
              const expiryCount = expiriesByDate[key]?.length ?? 0
              const today = key === diaryDateKey()
              const selected = key === selectedDate
              return <button key={key} type="button" aria-label={`${diaryDateLabel(key)}${hasActivity ? `, ${activityCount} aktivitas` : ''}${hasExpiry ? `, ${expiryCount} pengingat masa berlaku` : ''}`} aria-pressed={selected} aria-current={today ? 'date' : undefined} className={`calendar-day ${inMonth ? '' : 'calendar-day--outside'} ${selected ? 'calendar-day--selected' : ''} ${today ? 'calendar-day--today' : ''} ${hasActivity ? 'calendar-day--has-entry' : ''} ${hasExpiry ? 'calendar-day--has-expiry' : ''}`} onClick={() => selectDate(key)}>
                <span className="calendar-day__number">{Number(key.slice(-2))}</span><span className="calendar-day__markers">{hasActivity && <span className="calendar-day__activity-marker"><Sparkles size={9} aria-hidden="true" /><small>{activityCount > 9 ? '9+' : activityCount}</small></span>}{hasExpiry && <span className="calendar-day__expiry-marker" aria-hidden="true">✿</span>}{today && !hasExpiry && <span className="calendar-day__today-marker" aria-hidden="true">♡</span>}</span>
              </button>
            })}
          </div> : <div className="calendar-agenda" aria-live="polite">
            {calendarLoading ? <p role="status">Memuat agenda…</p> : agendaRows.length ? agendaRows.map(([date, events]) => <button type="button" key={date} className={`calendar-agenda__day ${date === selectedDate ? 'calendar-agenda__day--selected' : ''}`} onClick={() => selectDate(date)}><strong>{diaryDateLabel(date)}</strong><span>{events.length} aktivitas</span></button>) : <div className="calendar-empty"><h3>Belum ada aktivitas bulan ini.</h3><p>Checklist skincare dan catatan kulit akan muncul di sini.</p></div>}
          </div>}

          <div className="calendar-legend"><span><Sparkles size={13} aria-hidden="true" /> Aktivitas tercatat</span><span><span className="calendar-legend__flower" aria-hidden="true">✿</span> Batas pakai efektif</span><span><span className="calendar-legend__today">♡</span> Hari ini</span></div>
        </Card>

        <motion.aside key={selectedDate} className="calendar-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
          <Card className="calendar-detail__card">
            <div className="calendar-detail__date"><span className="calendar-detail__icon"><CalendarDays size={17} aria-hidden="true" /></span><div><p className="page-eyebrow">DETAIL HARI</p><h2>{diaryDateLabel(selectedDate)}</h2></div></div>
            {productsLoading && <p className="calendar-data-warning" role="status">Memuat tanggal kedaluwarsa produk…</p>}
            {productsError && <p className="calendar-data-warning" role="status">Tanggal kedaluwarsa tidak tersedia: {productsError}</p>}
            {calendarLoading && activityMonth !== visibleMonth ? <p role="status">Memuat aktivitas…</p> : error ? <div className="calendar-empty"><p role="alert">{error}</p><Button variant="outline" onClick={() => void loadActivities(visibleMonth)}>Coba lagi</Button></div> : selectedActivities.length || selectedExpiries.length ? (
              <div className="calendar-activity-list">
                {selectedActivities.map((activity) => {
                  const manualNote = activity.activity_type === 'skin_note' && !activity.routine_completion_id && !activity.routine_item_id && !activity.product_id
                  return <article className="calendar-activity" key={activity.id}>
                    <div className="calendar-activity__heading"><Badge tone={activity.activity_type === 'skin_note' ? 'rose' : 'cream'} dot>{activityLabels[activity.activity_type] ?? 'Aktivitas'}</Badge>
                      {manualNote && <Button variant="ghost" size="icon" className="calendar-activity__delete" aria-label="Hapus catatan manual" title="Hapus catatan manual" disabled={Boolean(deletingNoteId)} onClick={() => setNoteToDelete(activity)}><Trash2 size={15} /></Button>}
                    </div>
                    <h3>{eventText(activity, items, products)}</h3>
                    {activity.notes && activity.notes !== 'Routine item completed' && <p>{activity.notes}</p>}
                    <span><Clock3 size={13} aria-hidden="true" /> {diaryTimeLabel(activity.occurred_at)}</span>
                  </article>
                })}
                {selectedExpiries.map((product) => <article className="calendar-activity calendar-activity--expiry" key={`expiry-${product.id}`}><Badge tone={product.expiryInfo.status === 'expired' ? 'rose' : 'cream'} dot>{product.expiryInfo.source === 'pao' ? 'Batas PAO' : 'Kedaluwarsa kemasan'}</Badge><h3>{product.name}</h3><p>{product.brand}</p></article>)}
                <Button variant="outline" className="calendar-entry__edit" onClick={() => { setNote(''); setModalOpen(true) }}>Tambah catatan hari ini</Button>
              </div>
            ) : <div className="calendar-empty"><span className="calendar-empty__icon"><Heart size={20} aria-hidden="true" /></span><h3>Belum ada aktivitas.</h3><p>Catatan kulit dan checklist selesai akan muncul pada tanggal ini.</p><Button onClick={() => { setNote(''); setModalOpen(true) }} leadingIcon={<Plus size={15} />}>Tulis catatan</Button></div>}
          </Card>
          <Card className="calendar-month-summary"><span className="calendar-month-summary__icon"><Sparkles size={17} aria-hidden="true" /></span><div><strong>{activeDays.size} hari beraktivitas</strong><p>di bulan {diaryMonthLabel(visibleMonth).split(' ')[0]}</p></div></Card>
        </motion.aside>
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setNote('') }} title="Catatan kulit" description={diaryDateLabel(selectedDate)} footer={<><Button variant="ghost" onClick={() => { setModalOpen(false); setNote('') }} leadingIcon={<ArrowLeft size={15} />}>Batal</Button><Button type="submit" form="diary-entry-form" loading={saving} trailingIcon={<ArrowRight size={15} />}>Simpan catatan</Button></>}>
        <form id="diary-entry-form" className="entry-form" onSubmit={saveEntry}><label htmlFor="diary-note">Bagaimana kondisi kulitmu?</label><textarea id="diary-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tuliskan apa yang kamu rasakan hari ini…" rows={5} required /></form>
      </Modal>
      <ConfirmationDialog open={Boolean(noteToDelete)} onCancel={() => setNoteToDelete(null)} onConfirm={() => void confirmDeleteNote()} title="Hapus catatan manual?" description="Catatan ini akan dihapus dari kalender. Aktivitas checklist dan log pemakaian tidak terpengaruh." confirmLabel="Hapus catatan" />
    </main>
  )
}
