import { motion } from 'motion/react'
import { ArrowDown, ArrowUp, CalendarDays, Check, Clock3, Moon, Pencil, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Modal, useToast } from '../components/index.js'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { ProgressRing } from '../components/app/ProgressRing.jsx'
import { ConfirmationDialog } from '../components/app/ConfirmationDialog.jsx'
import { useProducts } from '../components/app/ProductsProvider.jsx'
import { useRoutineCalendar } from '../components/app/RoutineCalendarProvider.jsx'
import { diaryDateKey, diaryDateLabel, diaryIsoWeekday } from '../lib/diary-date.js'
import { isRoutineItemScheduledOn, isRoutineScheduledOn } from '../lib/routine-schedule.js'

const routineTabs = [
  { key: 'morning', label: 'Rutinitas pagi', icon: Sun },
  { key: 'evening', label: 'Rutinitas malam', icon: Moon },
]
const weekdays = [{ n: 1, short: 'Sen', full: 'Senin' }, { n: 2, short: 'Sel', full: 'Selasa' }, { n: 3, short: 'Rab', full: 'Rabu' }, { n: 4, short: 'Kam', full: 'Kamis' }, { n: 5, short: 'Jum', full: 'Jumat' }, { n: 6, short: 'Sab', full: 'Sabtu' }, { n: 7, short: 'Min', full: 'Minggu' }]

export default function DailyRoutinePage() {
  const [searchParams] = useSearchParams()
  const [activeKind, setActiveKind] = useState(() => searchParams.get('kind') === 'evening' ? 'evening' : 'morning')
  const [busyAction, setBusyAction] = useState('')
  const [routineNameDraft, setRoutineNameDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleWeekday, setScheduleWeekday] = useState(diaryIsoWeekday(diaryDateKey()))
  const [scheduleDraft, setScheduleDraft] = useState({ morning: {}, evening: {} })
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const { products, loading: productsLoading } = useProducts()
  const { routines, items, completedItemIds, loading, error, reload, createRoutine, updateRoutine, archiveRoutine, updateDays, addItem, updateItemDays, moveItem, setCompletion, loadChecklist } = useRoutineCalendar()
  const { showToast } = useToast()
  const today = diaryDateKey()
  const routine = routines.find((item) => item.kind === activeKind)
  const routineSteps = useMemo(() => items.filter((item) => item.routine_id === routine?.id).sort((a, b) => a.position - b.position), [items, routine?.id])
  const weekday = diaryIsoWeekday(today)
  const steps = routineSteps.filter((step) => isRoutineItemScheduledOn(step, routine, weekday))
  const completeCount = steps.filter((step) => completedItemIds.includes(step.id)).length
  const progress = steps.length ? Math.round((completeCount / steps.length) * 100) : 0
  const activeToday = isRoutineScheduledOn(routine, diaryIsoWeekday(today))
  const allActiveItems = items.filter((item) => isRoutineItemScheduledOn(item, routines.find((entry) => entry.id === item.routine_id), weekday))
  const allDone = allActiveItems.filter((item) => completedItemIds.includes(item.id)).length
  const allProgress = allActiveItems.length ? Math.round(allDone / allActiveItems.length * 100) : 0

  useEffect(() => { setRoutineNameDraft(routine?.name ?? '') }, [routine?.id, routine?.name])
  useEffect(() => { setEditing(false) }, [activeKind, routine?.id])
  useEffect(() => { void loadChecklist(today).catch((loadError) => showToast(loadError.message || 'Checklist gagal dimuat.', { tone: 'error' })) }, [today, loadChecklist, showToast])

  async function perform(action, task, successMessage) {
    setBusyAction(action)
    try { await task(); if (successMessage) showToast(successMessage) }
    catch (failure) { showToast(failure.message || 'Perubahan belum dapat disimpan.', { tone: 'error' }) }
    finally { setBusyAction('') }
  }

  function openScheduleEditor() {
    const initial = { morning: {}, evening: {} }
    for (const day of weekdays) {
      for (const kind of ['morning', 'evening']) {
        const parent = routines.find((item) => item.kind === kind)
        initial[kind][day.n] = items.filter((item) => item.routine_id === parent?.id && item.product_id && isRoutineItemScheduledOn(item, parent, day.n)).map((item) => item.product_id)
      }
    }
    setScheduleWeekday(weekday)
    setScheduleDraft(initial)
    setScheduleOpen(true)
  }

  function toggleScheduleProduct(kind, selectedProductId) {
    setScheduleDraft((current) => {
      const selected = current[kind][scheduleWeekday] ?? []
      const next = selected.includes(selectedProductId) ? selected.filter((id) => id !== selectedProductId) : [...selected, selectedProductId]
      return { ...current, [kind]: { ...current[kind], [scheduleWeekday]: next } }
    })
  }

  async function saveSchedule() {
    if (productsLoading || !products.length) {
      showToast('Tambahkan produk ke koleksi sebelum mengatur rutinitas.', { tone: 'info' })
      return
    }
    await perform('schedule-save', async () => {
      for (const kind of ['morning', 'evening']) {
        let parent = routines.find((item) => item.kind === kind)
        const assignedByProduct = new Map(products.map((product) => [product.id, weekdays.filter((day) => scheduleDraft[kind][day.n]?.includes(product.id)).map((day) => day.n)]))
        if (!parent && [...assignedByProduct.values()].some((days) => days.length)) parent = await createRoutine(kind)
        if (!parent) continue

        const currentItems = items.filter((item) => item.routine_id === parent.id)
        let nextPosition = Math.max(...currentItems.map((item) => item.position), -1) + 1
        const existingProducts = new Set()
        for (const item of currentItems) {
          if (!item.product_id) continue
          existingProducts.add(item.product_id)
          const nextDays = assignedByProduct.get(item.product_id) ?? []
          const currentDays = item.active_days ?? parent.active_days ?? [1, 2, 3, 4, 5, 6, 7]
          if (currentDays.length !== nextDays.length || currentDays.some((day) => !nextDays.includes(day))) await updateItemDays(item.id, nextDays)
        }
        for (const product of products) {
          const days = assignedByProduct.get(product.id) ?? []
          if (!existingProducts.has(product.id) && days.length) await addItem(parent.id, product, days, nextPosition++)
        }

        const activeItemDays = currentItems.filter((item) => !item.product_id).flatMap((item) => item.active_days ?? parent.active_days ?? [])
        for (const days of assignedByProduct.values()) activeItemDays.push(...days)
        const nextRoutineDays = [...new Set(activeItemDays)].sort((left, right) => left - right)
        const currentRoutineDays = parent.active_days ?? []
        if (currentRoutineDays.length !== nextRoutineDays.length || currentRoutineDays.some((day) => !nextRoutineDays.includes(day))) await updateDays(parent.id, nextRoutineDays)
      }
      setScheduleOpen(false)
    }, 'Jadwal produk pagi dan malam berhasil disimpan.')
  }

  function handleSaveRoutineName() {
    if (!routine || !routineNameDraft.trim() || routineNameDraft.trim() === routine.name) return
    void perform('routine-name', () => updateRoutine(routine.id, { name: routineNameDraft }), 'Nama rutinitas diperbarui.')
  }

  function handleToggleStep(step, checked) {
    void perform(`step-${step.id}`, () => setCompletion(step.id, checked, today), checked ? `${step.label} ditandai selesai.` : `${step.label} belum ditandai selesai.`)
  }

  return (
    <main className="page-content">
      <PageHeading eyebrow="Kebiasaan yang terasa baik" title="Daily Routine" description="Pilih produk untuk setiap hari, lalu tandai pemakaiannya di checklist hari ini." action={<div className="routine-page-heading-actions"><Button variant="primary" leadingIcon={<CalendarDays size={15} />} onClick={openScheduleEditor}>Atur Produk & Hari</Button><Badge tone="cream" dot>{diaryDateLabel(today, { day: 'numeric', month: 'long' })}</Badge></div>} />

      <Card className="routine-overview">
        <div className="routine-overview__copy"><span className="routine-overview__eyebrow"><Check size={14} aria-hidden="true" /> PROGRES HARI INI</span><h2>{allDone} dari {allActiveItems.length} langkah selesai</h2><p>Progress tersimpan per tanggal kalender Asia/Jakarta.</p></div>
        <div className="routine-progress-copy"><ProgressRing value={allProgress} size={72} label="Progress semua rutinitas aktif hari ini" /></div>
      </Card>

      <div className="routine-page-layout">
        <section className="routine-main">
          <div className="routine-tabs" role="tablist" aria-label="Pilih waktu rutinitas">
            {routineTabs.map(({ key, label, icon: Icon }) => <button key={key} className={`routine-tab ${activeKind === key ? 'routine-tab--active' : ''}`} type="button" role="tab" aria-selected={activeKind === key} onClick={() => setActiveKind(key)}><Icon size={17} aria-hidden="true" />{label}</button>)}
          </div>

          {loading ? <Card className="empty-card" role="status">Memuat rutinitas…</Card> : error ? (
            <Card className="empty-card"><h2>Rutinitas belum dapat dimuat.</h2><p role="alert">{error}</p><Button variant="outline" onClick={() => void reload()}>Coba lagi</Button></Card>
          ) : !routine ? (
            <Card className="empty-card routine-empty"><span className="empty-card__icon">{activeKind === 'morning' ? <Sun size={21} /> : <Moon size={21} />}</span><h2>Atur rutinitas {activeKind === 'morning' ? 'pagi' : 'malam'}.</h2><p>Pilih produk dari koleksi dan tentukan hari pemakaiannya.</p><Button leadingIcon={<CalendarDays size={15} />} onClick={openScheduleEditor}>Pilih Produk & Hari</Button></Card>
          ) : (
            <motion.div key={activeKind} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
              <Card className={`routine-checklist-card ${editing ? 'routine-checklist-card--editing' : ''}`}>
                <div className="routine-checklist-card__header"><div><p className="page-eyebrow">RITUAL {activeKind === 'morning' ? 'PAGI' : 'MALAM'}</p>{editing ? <div className="routine-name-edit"><input aria-label="Nama rutinitas" value={routineNameDraft} maxLength={80} onChange={(event) => setRoutineNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleSaveRoutineName() } }} /><Button variant="outline" size="sm" onClick={handleSaveRoutineName} disabled={Boolean(busyAction) || !routineNameDraft.trim() || routineNameDraft.trim() === routine.name}>Simpan nama</Button></div> : <h2>{routine.name}</h2>}<Badge tone={activeToday ? 'cream' : 'neutral'}><Clock3 size={12} /> {activeToday ? `${completeCount}/${steps.length} selesai` : 'Tidak dijadwalkan hari ini'}</Badge></div><div className="routine-checklist-card__actions"><Button variant={editing ? 'secondary' : 'outline'} size="sm" leadingIcon={<Pencil size={14} />} aria-pressed={editing} onClick={() => setEditing((value) => !value)}>{editing ? 'Selesai mengelola' : 'Kelola langkah'}</Button></div></div>
                {activeToday && <div className="routine-progress-copy"><span>{completeCount} dari {steps.length} langkah selesai hari ini</span></div>}
                {!activeToday && <div className="routine-today-empty"><span aria-hidden="true">✿</span><p>Checklist {activeKind === 'morning' ? 'pagi' : 'malam'} hanya ditampilkan pada hari jadwalnya.</p>{!editing && <Button size="sm" variant="outline" leadingIcon={<Pencil size={13} />} onClick={openScheduleEditor}>Edit Rutinitas</Button>}</div>}
                <div className="routine-steps">
                  {(activeToday || editing) && (editing ? routineSteps : steps).length ? (editing ? routineSteps : steps).map((step, index) => {
                    const product = products.find((item) => item.id === step.product_id)
                    const checked = completedItemIds.includes(step.id)
                    const routinePosition = routineSteps.findIndex((item) => item.id === step.id)
                    return (
                      <motion.div layout className={`routine-step ${checked ? 'routine-step--complete' : ''}`} key={step.id} animate={{ backgroundColor: checked ? 'rgba(252, 228, 232, .36)' : 'rgba(255, 255, 255, 0)' }} transition={{ duration: .2 }}>
                        <label className="routine-step__check" aria-label={`${checked ? 'Tandai belum selesai' : 'Tandai selesai'}: ${step.label}`}>
                          <input type="checkbox" checked={checked} disabled={!activeToday || busyAction === `step-${step.id}`} onChange={(event) => handleToggleStep(step, event.target.checked)} />
                          <span className="routine-step__custom">{checked && <motion.span initial={{ scale: .45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 22 }}><Check size={13} aria-hidden="true" /></motion.span>}</span>
                        </label>
                        <span className="routine-step__number">{String(index + 1).padStart(2, '0')}</span>
                        <div className="routine-step__copy"><strong>{product ? <Link to={`/collection/${product.id}`}>{step.label}</Link> : step.label}</strong><p>{step.instructions || 'Gunakan sesuai petunjuk pada produk.'}</p></div>
                        {editing && <div className="routine-step__manage" aria-label={`Atur urutan ${step.label}`}><Button variant="outline" size="sm" leadingIcon={<ArrowUp size={13} />} aria-label={`Naikkan ${step.label}`} disabled={routinePosition === 0 || Boolean(busyAction)} onClick={() => void perform('order', () => moveItem(routine.id, step.id, -1))}>Naikkan</Button><Button variant="outline" size="sm" leadingIcon={<ArrowDown size={13} />} aria-label={`Turunkan ${step.label}`} disabled={routinePosition === routineSteps.length - 1 || Boolean(busyAction)} onClick={() => void perform('order', () => moveItem(routine.id, step.id, 1))}>Turunkan</Button></div>}
                      </motion.div>
                    )
                  }) : activeToday ? <div className="routine-no-items"><p>Belum ada produk di rutinitas ini.</p>{products.length === 0 && <Link to="/collection">Tambahkan produk ke koleksi</Link>}</div> : null}
                </div>
              </Card>

            </motion.div>
          )}
        </section>

        <aside className="routine-aside"><Card className="routine-note-card"><span className="routine-note-card__icon"><Clock3 size={18} aria-hidden="true" /></span><p className="page-eyebrow">PENGINGAT LEMBUT</p><h3>Berikan waktu untuk dirimu.</h3><p>Checklist tersimpan sebagai satu penyelesaian per langkah dan tanggal. Tanggal aktivitas mengikuti zona waktu Asia/Jakarta.</p><Link className="text-link" to="/calendar">Lihat kalender aktivitas</Link></Card></aside>
      </div>
      {routine && editing && <div className="routine-archive-action"><Button variant="ghost" onClick={() => setArchiveConfirm(true)}>Hapus rutinitas dari daftar</Button><small>Riwayat checklist akan tetap tersimpan.</small></div>}
      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Atur produk per hari" description="Pilih satu hari, lalu centang produk yang ingin dipakai pada pagi dan malam. Tiap hari bisa punya pilihan berbeda." className="routine-schedule-modal" footer={<><Button variant="outline" onClick={() => setScheduleOpen(false)}>Batal</Button><Button onClick={() => void saveSchedule()} loading={busyAction === 'schedule-save'} disabled={Boolean(busyAction) || productsLoading}>Simpan jadwal</Button></>}>
        <div className="routine-schedule-modal__day-picker" role="group" aria-label="Pilih hari untuk mengatur produk">
          {weekdays.map((day) => <button key={day.n} type="button" aria-label={day.full} aria-pressed={scheduleWeekday === day.n} className={scheduleWeekday === day.n ? 'routine-schedule-modal__day--active' : ''} onClick={() => setScheduleWeekday(day.n)}>{day.short}</button>)}
        </div>
        <p className="routine-schedule-modal__selected-day">Produk untuk <strong>{weekdays.find((day) => day.n === scheduleWeekday)?.full}</strong></p>
        <div className="routine-schedule-modal__sections">
          {routineTabs.map(({ key, label, icon: Icon }) => <section className={`routine-schedule-modal__section routine-schedule-modal__section--${key}`} key={key} aria-labelledby={`schedule-${key}`}>
            <h3 id={`schedule-${key}`}><Icon size={17} aria-hidden="true" />{label}</h3>
            <p>Centang produk yang masuk checklist {key === 'morning' ? 'pagi' : 'malam'}.</p>
            {productsLoading ? <p role="status">Memuat koleksi produk…</p> : products.length ? <div className="routine-schedule-modal__products">
              {products.map((product) => {
                const checked = (scheduleDraft[key][scheduleWeekday] ?? []).includes(product.id)
                return <label className={`routine-schedule-product ${checked ? 'routine-schedule-product--selected' : ''}`} key={product.id}>
                  <input type="checkbox" checked={checked} disabled={Boolean(busyAction)} onChange={() => toggleScheduleProduct(key, product.id)} />
                  <span className="routine-schedule-product__check" aria-hidden="true">{checked ? <Check size={13} /> : null}</span>
                  <span className="routine-schedule-product__copy"><strong>{product.name}</strong><small>{product.brand || 'Produk skincare'}</small></span>
                </label>
              })}
            </div> : <p className="routine-schedule-modal__empty">Belum ada produk di koleksi. Tambahkan produk lebih dulu.</p>}
          </section>)}
        </div>
        <p className="routine-schedule-modal__note"><Clock3 size={14} /> Checklist harian hanya menampilkan produk yang dijadwalkan hari ini. Zona waktu: Asia/Jakarta.</p>
      </Modal>
      <ConfirmationDialog open={archiveConfirm} onCancel={() => setArchiveConfirm(false)} onConfirm={() => { setArchiveConfirm(false); void perform('archive', () => archiveRoutine(routine.id), 'Rutinitas diarsipkan. Riwayat aktivitas tetap tersimpan.') }} title="Hapus rutinitas dari daftar?" description="Rutinitas dan langkahnya akan disembunyikan. Checklist serta log pemakaian lama tetap tersimpan." confirmLabel="Hapus dari daftar" />
    </main>
  )
}
