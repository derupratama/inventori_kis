import { motion } from 'motion/react'
import { AlertTriangle, ArrowRight, BookHeart, ChevronRight, Droplets, Heart, Moon, Plus, Sparkles, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, LoadingSkeleton } from '../components/index.js'
import { ProductCard } from '../components/app/ProductCard.jsx'
import { PageHeading } from '../components/app/PageHeading.jsx'
import { SectionTitle } from '../components/app/SectionTitle.jsx'
import { StatCard } from '../components/app/StatCard.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useProducts } from '../components/app/ProductsProvider.jsx'
import { useRoutineCalendar } from '../components/app/RoutineCalendarProvider.jsx'
import { diaryDateKey, diaryDateLabel, diaryIsoWeekday } from '../lib/diary-date.js'
import { expiryStatusLabels, getExpiryInfo } from '../lib/expiration.js'
import { isRoutineItemScheduledOn } from '../lib/routine-schedule.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const { routines, items, completedItemIds, activities, loading: diaryLoading, error: diaryError } = useRoutineCalendar()
  const today = diaryDateKey()
  const todayWeekday = diaryIsoWeekday(today)
  const morningRoutine = routines.find((routine) => routine.kind === 'morning')
  const morningItems = items.filter((item) => item.routine_id === morningRoutine?.id && isRoutineItemScheduledOn(item, morningRoutine, todayWeekday)).sort((a, b) => a.position - b.position)
  const doneCount = morningItems.filter((item) => completedItemIds.includes(item.id)).length
  const routineProgress = morningItems.length ? Math.round(doneCount / morningItems.length * 100) : 0
  const eveningRoutine = routines.find((routine) => routine.kind === 'evening')
  const eveningItems = items.filter((item) => item.routine_id === eveningRoutine?.id && isRoutineItemScheduledOn(item, eveningRoutine, todayWeekday)).sort((a, b) => a.position - b.position)
  const eveningDoneCount = eveningItems.filter((item) => completedItemIds.includes(item.id)).length
  const eveningProgress = eveningItems.length ? Math.round(eveningDoneCount / eveningItems.length * 100) : 0
  const recentActivities = [...activities].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 3)
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'diary'
  const todayLabel = diaryDateLabel(today, { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = new Date().getHours()
  const timeGreeting = hour >= 4 && hour < 11 ? 'Selamat pagi' : hour >= 11 && hour < 15 ? 'Selamat siang' : hour >= 15 && hour < 18 ? 'Selamat sore' : 'Selamat malam'
  const latestMood = [...activities].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).find((activity) => activity.mood)?.mood
  const greetingContext = diaryLoading ? 'Pelan-pelan saja, setiap langkah kecil untuk kulitmu tetap berarti.'
    : latestMood ? `Catatan kulit terakhirmu: ${latestMood.toLowerCase()}. Dengarkan kebutuhan kulitmu hari ini.`
      : morningItems.length > 0 && doneCount === morningItems.length ? 'Rutinitas pagimu sudah tuntas. Semoga kulitmu menikmati perhatian kecil itu.'
        : morningItems.length > 0 ? 'Satu langkah kecil sudah cukup untuk memulai. Lanjutkan rutinitasmu saat siap.'
          : products.length > 0 ? 'Koleksi skincare-mu siap menemani ritual kecil hari ini.'
            : 'Luangkan waktu sejenak untuk dirimu dan kulitmu hari ini.'
  const featuredProducts = products.slice(0, 3)
  const expiryReminders = products.map((product) => ({ product, expiry: getExpiryInfo(product, today) }))
    .filter(({ expiry }) => expiry.status === 'expired' || expiry.status === 'expiring_soon')
    .sort((left, right) => left.expiry.effectiveExpiryDate.localeCompare(right.expiry.effectiveExpiryDate))

  return (
    <main className="page-content">
      <PageHeading eyebrow={todayLabel} title={<>{timeGreeting}, {displayName} <span className="heading-flower">✿</span></>} description={greetingContext} action={<Button as={Link} to="/calendar" leadingIcon={<Plus size={16} />}>Catat hari ini</Button>} />

      <motion.section className="dashboard-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
        <div className="dashboard-hero__copy"><Badge tone="cream" dot>Perjalanan kecilmu</Badge><h2>Rawat dengan lembut,<br /><em>tumbuh dengan sabar.</em></h2><p>Setiap catatan membantu mengenali apa yang terasa baik untuk kulitmu.</p><Link className="text-link" to="/calendar">Lihat jurnal kulit <ArrowRight size={15} /></Link></div>
        <div className="dashboard-hero__illustration" aria-hidden="true"><span className="dashboard-hero__sun"><Sun size={44} strokeWidth={1.2} /></span><span className="dashboard-hero__flower">✿</span><span className="dashboard-hero__leaf"><Sparkles size={17} /></span></div>
      </motion.section>

      <section className="dashboard-stats" aria-label="Ringkasan perjalanan kulit">
        <StatCard label="Aktivitas kalender" value={diaryLoading ? '…' : activities.length} detail="catatan & langkah bulan ini" icon={Sparkles} tone="cream" />
        <StatCard label="Koleksi produk" value={productsLoading ? '…' : products.length} detail="produk tersimpan" icon={Droplets} tone="muted" />
      </section>

      <section className="dashboard-routines" aria-label="Rutinitas harian">
        {[{ kind: 'morning', label: 'Rutinitas pagi', routine: morningRoutine, items: morningItems, done: doneCount, progress: routineProgress, Icon: Sun }, { kind: 'evening', label: 'Rutinitas malam', routine: eveningRoutine, items: eveningItems, done: eveningDoneCount, progress: eveningProgress, Icon: Moon }].map(({ kind, label, routine, items: routineItems, done, progress, Icon }) => <Card className="routine-card" key={kind}>
          {diaryLoading ? <div className="dashboard-loading"><LoadingSkeleton variant="line" /><LoadingSkeleton variant="line" /></div> : diaryError ? <p className="dashboard-message" role="alert">{diaryError}</p> : <>
            <div className="routine-card__top"><span className={`routine-icon routine-icon--${kind}`}><Icon size={19} aria-hidden="true" /></span><Link className="routine-card__arrow" to={`/routine?kind=${kind}`} aria-label={`Buka ${label}`}><ChevronRight size={18} /></Link></div>
            <div className="routine-card__title"><div><h3>{routine?.name ?? label}</h3><p>{routineItems.length ? `${done} dari ${routineItems.length} langkah selesai hari ini` : 'Tidak ada langkah terjadwal hari ini'}</p></div><span className="routine-card__progress">{routineItems.length ? `${progress}%` : '—'}</span></div>
            <div className="progress-track" role="progressbar" aria-label={`Progres ${label}`} aria-valuenow={routine ? done : 0} aria-valuemin={0} aria-valuemax={routineItems.length || 1}><span style={{ width: `${routine ? progress : 0}%` }} /></div>
          </>}
        </Card>)}
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-block">
          <SectionTitle title="Catatan terbaru" description="Jejak kecil dari perjalananmu." action={<Link className="text-link text-link--small" to="/calendar">Buka kalender <ArrowRight size={14} /></Link>} />
          <Card className="journal-list">
            {diaryLoading ? <div className="dashboard-loading"><LoadingSkeleton variant="line" /><LoadingSkeleton variant="line" /><LoadingSkeleton variant="line" /></div> : diaryError ? <p className="dashboard-message" role="alert">{diaryError}</p> : recentActivities.length ? recentActivities.map((activity) => {
              const routineItem = items.find((item) => item.id === activity.routine_item_id)
              const title = activity.mood || routineItem?.label || (activity.activity_type === 'product_used' ? 'Langkah skincare selesai' : 'Catatan kulit')
              const description = activity.notes === 'Routine item completed' ? 'Rutinitas selesai' : activity.notes || activity.activity_type.replaceAll('_', ' ')
              const date = activity.activity_date
              return <Link className="journal-list__item" key={activity.id} to={`/calendar?date=${date}`}><span className={`journal-list__mood ${activity.activity_type === 'product_used' ? 'journal-list__mood--cream' : ''}`}><Heart size={15} aria-hidden="true" /></span><span className="journal-list__copy"><strong>{title}</strong><small>{description}</small></span><time dateTime={activity.activity_date}>{diaryDateLabel(date, { day: 'numeric', month: 'short' })}</time></Link>
            }) : <p className="dashboard-message">Belum ada aktivitas di kalender bulan ini.</p>}
          </Card>
        </section>
      </div>

      <section className="dashboard-block dashboard-expiry-reminders">
        <SectionTitle title="Pengingat masa berlaku" description="Periksa produk yang sudah atau segera mencapai batas pakainya." action={<Link className="text-link text-link--small" to="/collection">Buka koleksi <ArrowRight size={14} /></Link>} />
        {productsLoading ? <Card className="dashboard-message" role="status">Memeriksa masa berlaku produk…</Card> : productsError ? <Card className="dashboard-message" role="alert">Pengingat masa berlaku belum dapat dimuat: {productsError}</Card> : expiryReminders.length ? (
          <Card className="expiry-reminder-list">
            {expiryReminders.map(({ product, expiry }) => {
              const message = expiry.daysRemaining < 0 ? `Kedaluwarsa ${Math.abs(expiry.daysRemaining)} hari lalu` : expiry.daysRemaining === 0 ? 'Batas pakai hari ini' : `${expiry.daysRemaining} hari lagi`
              return <Link className="expiry-reminder" key={product.id} to={`/collection/${product.id}`}>
                <span className={`expiry-reminder__icon ${expiry.status === 'expired' ? 'expiry-reminder__icon--expired' : ''}`}><AlertTriangle size={17} aria-hidden="true" /></span>
                <span className="expiry-reminder__copy"><strong>{product.name}</strong><small>{expiryStatusLabels[expiry.status]} · {message} · {diaryDateLabel(expiry.effectiveExpiryDate, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            })}
          </Card>
        ) : <Card className="dashboard-message">Belum ada produk yang perlu diperiksa dalam 30 hari ke depan.</Card>}
      </section>

      <section className="dashboard-block dashboard-products">
        <SectionTitle title="Dari koleksimu" description="Produk yang menemani rutinitasmu." action={<Link className="text-link text-link--small" to="/collection">Lihat koleksi <ArrowRight size={14} /></Link>} />
        {productsLoading ? <div className="product-grid product-grid--loading" aria-label="Produk sedang dimuat" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <LoadingSkeleton variant="card" key={index} />)}</div> : productsError ? <Card className="empty-card" role="alert"><p>{productsError}</p></Card> : <div className="product-grid product-grid--dashboard">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}{featuredProducts.length === 0 && <Card className="empty-card"><BookHeart size={22} /><p>Belum ada produk dalam koleksimu.</p><Button as={Link} to="/collection">Tambah produk</Button></Card>}</div>}
      </section>
      <footer className="page-footer"><span><Heart size={13} aria-hidden="true" /> Dibuat dengan lembut, untuk perjalananmu</span><span>My Skin Diary</span></footer>
    </main>
  )
}
